<?php

namespace Plugins\Custom\ViewerPdf\Support;

final class ViewerPdfSettings
{
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
        foreach (self::candidateFiles() as $path) {
            if (!$path || !is_file($path)) {
                continue;
            }
            try {
                $raw = json_decode((string) file_get_contents($path), true);
                if (!is_array($raw)) {
                    continue;
                }
                if (isset($raw['defaults']) && is_array($raw['defaults'])) {
                    $raw = $raw['defaults'];
                }
                if (isset($raw['settings']) && is_array($raw['settings'])) {
                    $raw = $raw['settings'];
                }
                foreach ($raw as $k => $v) {
                    if (is_array($v) && array_key_exists('default', $v)) {
                        $raw[$k] = $v['default'];
                    }
                }
                $out = array_merge($out, array_intersect_key($raw, $out));
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
        $id = 'custom-viewer_pdf';
        $try = [];
        if (function_exists('g7_plugin_settings')) {
            $try[] = g7_plugin_settings($id);
        }
        try {
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
        } catch (\Throwable $e) {
        }

        foreach ($try as $row) {
            if (is_array($row) && $row) {
                return $row;
            }
        }

        return [];
    }

    public static function put(array $data): array
    {
        $cur = self::get();
        foreach ($data as $k => $v) {
            if ($v === null) {
                unset($data[$k]);
            }
        }
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
        file_put_contents(self::path(), json_encode($next, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        return $next;
    }

    private static function clampBadgeOrder(mixed $value): int
    {
        return max(0, min(999, (int) $value));
    }
}
