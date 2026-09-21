<?php

namespace Plugins\Custom\ViewerPdf\Support;

final class ViewerPdfSettings
{
    private static bool $readingG7 = false;

    private static bool $writingG7 = false;
    public static function defaults(): array
    {
        return [
            'badge_label' => 'PDF',
            'badge_icon' => '📄',
            'badge_order' => 20,
            'show_print' => true,
            'show_download' => true,
            'show_page_thumbs' => true,
            'show_file_rail' => true,
            'show_zoom' => true,
            'wheel_turns_page' => true,
            'wheel_scroll_px' => 140,
            'default_scale' => 1.15,
        ];
    }

    public static function path(): string
    {
        $dir = storage_path('app/plugins/custom-viewer_pdf');
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        return $dir.'/settings.json';
    }

    public static function get(): array
    {
        $out = self::defaults();
        $out = self::mergeRow($out, self::fromG7());
        foreach (self::candidateFiles() as $path) {
            if (!$path || !is_file($path)) {
                continue;
            }
            try {
                $raw = json_decode((string) file_get_contents($path), true);
                $out = self::mergeRow($out, $raw);
            } catch (\Throwable $e) {
            }
        }
        $out['badge_order'] = self::clampBadgeOrder($out['badge_order'] ?? 20);

        return $out;
    }

    /**
     * @return list<string>
     */
    private static function candidateFiles(): array
    {
        $id = 'custom-viewer_pdf';
        $out = [self::path()];
        if (function_exists('storage_path')) {
            $out[] = storage_path('app/plugins/'.$id.'/settings.json');
            $out[] = storage_path('app/settings/plugins/'.$id.'.json');
            $out[] = storage_path('app/settings/plugin_'.$id.'.json');
            $out[] = storage_path('app/settings/'.$id.'.json');
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private static function fromG7(): array
    {
        if (self::$readingG7 || self::$writingG7) {
            return [];
        }
        self::$readingG7 = true;
        try {
            $id = 'custom-viewer_pdf';
            $try = [];
            if (function_exists('g7_plugin_settings')) {
                $try[] = g7_plugin_settings($id);
            }
            if (function_exists('app')) {
                foreach ([
                    'App\\Services\\PluginSettingsService',
                    'App\\Services\\Extension\\PluginSettingsService',
                    'App\\Extension\\PluginSettings',
                ] as $cls) {
                    if (! class_exists($cls)) {
                        continue;
                    }
                    $svc = app($cls);
                    foreach (['get', 'getSettings', 'values'] as $m) {
                        if (is_object($svc) && method_exists($svc, $m)) {
                            $try[] = $svc->{$m}($id);
                        }
                    }
                }
            }

            foreach ($try as $row) {
                if (is_array($row) && $row) {
                    return $row;
                }
            }
        } catch (\Throwable $e) {
        } finally {
            self::$readingG7 = false;
        }

        return [];
    }

    public static function put(array $data): array
    {
        $cur = self::get();
        $data = self::unwrapRow($data);
        foreach ($data as $k => $v) {
            if ($v === null) {
                unset($data[$k]);
            }
        }
        $data = array_intersect_key($data, self::defaults());
        $next = array_merge($cur, $data);
        $next['badge_label'] = mb_substr(trim((string) ($next['badge_label'] ?? 'PDF')), 0, 16);
        $next['badge_icon'] = mb_substr(trim((string) ($next['badge_icon'] ?? '📄')), 0, 8);
        foreach (['show_print', 'show_download', 'show_page_thumbs', 'show_file_rail', 'show_zoom', 'wheel_turns_page'] as $k) {
            $next[$k] = !empty($next[$k]) && $next[$k] !== '0' && $next[$k] !== 'false';
        }
        $scale = (float) ($next['default_scale'] ?? 1.15);
        $next['default_scale'] = max(0.5, min(3.0, $scale ?: 1.15));
        $step = (int) ($next['wheel_scroll_px'] ?? 140);
        $next['wheel_scroll_px'] = max(40, min(800, $step ?: 140));
        $next['badge_order'] = self::clampBadgeOrder($next['badge_order'] ?? 20);
        $json = json_encode($next, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        file_put_contents(self::path(), $json);
        self::writeG7($next);

        return $next;
    }

    /**
     * @param  array<string, mixed>  $out
     * @return array<string, mixed>
     */
    private static function mergeRow(array $out, mixed $raw): array
    {
        $raw = self::unwrapRow($raw);
        if ($raw === []) {
            return $out;
        }

        return array_merge($out, array_intersect_key($raw, $out));
    }

    /**
     * @return array<string, mixed>
     */
    private static function unwrapRow(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }
        foreach (['defaults', 'settings', 'form', 'values', 'config', 'data'] as $wrap) {
            if (isset($raw[$wrap]) && is_array($raw[$wrap]) && ! array_key_exists('badge_order', $raw) && ! array_key_exists('badge_icon', $raw)) {
                $raw = $raw[$wrap];
                break;
            }
        }
        foreach ($raw as $k => $v) {
            if (! is_array($v)) {
                continue;
            }
            if (array_key_exists('value', $v)) {
                $raw[$k] = $v['value'];
            } elseif (array_key_exists('default', $v) && count($v) <= 4) {
                $raw[$k] = $v['default'];
            }
        }

        return $raw;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function writeG7(array $data): void
    {
        if (self::$writingG7 || self::$readingG7) {
            return;
        }
        self::$writingG7 = true;
        $id = 'custom-viewer_pdf';
        try {
            foreach (['g7_plugin_settings_set', 'g7_set_plugin_settings'] as $fn) {
                if (function_exists($fn)) {
                    $fn($id, $data);
                }
            }
            if (! function_exists('app')) {
                return;
            }
            foreach ([
                'App\\Services\\PluginSettingsService',
                'App\\Services\\Extension\\PluginSettingsService',
                'App\\Extension\\PluginSettings',
            ] as $cls) {
                if (! class_exists($cls)) {
                    continue;
                }
                $svc = app($cls);
                if (! is_object($svc)) {
                    continue;
                }
                foreach (['put', 'set', 'setSettings', 'save', 'update'] as $m) {
                    if (method_exists($svc, $m)) {
                        $svc->{$m}($id, $data);
                    }
                }
            }
        } catch (\Throwable $e) {
        } finally {
            self::$writingG7 = false;
        }
    }

    private static function clampBadgeOrder(mixed $value): int
    {
        return max(0, min(999, (int) $value));
    }
}
