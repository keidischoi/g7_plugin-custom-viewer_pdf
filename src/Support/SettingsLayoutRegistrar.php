<?php

namespace Plugins\Custom\ViewerPdf\Support;

/**
 * G7 admin settings fetches template_id + name=custom-viewer_pdf.plugin_settings.
 *
 * registerPluginLayouts() stores admin/plugin_settings.json as
 * {identifier}.{layout_name}. layout_name in the file must stay "plugin_settings".
 */
final class SettingsLayoutRegistrar
{
    public const LAYOUT_NAME = 'custom-viewer_pdf.plugin_settings';

    public const BASE_LAYOUT_NAME = 'plugin_settings';

    public static function ensure(): void
    {
        static $done = false;
        if ($done) {
            return;
        }
        $done = true;
        try {
            $data = self::payloadArray();
            if ($data === null) {
                return;
            }
            if (class_exists(\App\Models\TemplateLayout::class)) {
                self::upsertModel($data);

                return;
            }
            self::upsertTables($data);
        } catch (\Throwable $e) {
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function payloadArray(): ?array
    {
        $path = dirname(__DIR__, 2).'/resources/layouts/admin/plugin_settings.json';
        if (! is_file($path)) {
            return null;
        }
        $data = json_decode((string) file_get_contents($path), true);
        if (! is_array($data) || ! isset($data['slots'])) {
            return null;
        }
        $data['layout_name'] = self::BASE_LAYOUT_NAME;
        unset($data['name'], $data['init_actions']);
        if (! isset($data['components']) || ! is_array($data['components'])) {
            $data['components'] = [];
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function upsertModel(array $data): void
    {
        $sourceType = 'plugin';
        if (class_exists(\App\Enums\LayoutSourceType::class)) {
            $sourceType = \App\Enums\LayoutSourceType::Plugin;
        }

        $ids = self::adminTemplateIds();
        foreach ($ids as $templateId) {
            $q = \App\Models\TemplateLayout::query();
            if (method_exists($q->getModel(), 'restore')) {
                $q = \App\Models\TemplateLayout::withTrashed();
            }
            $row = $q->where('template_id', $templateId)
                ->where('name', self::LAYOUT_NAME)
                ->first();

            $patch = [
                'template_id' => $templateId,
                'name' => self::LAYOUT_NAME,
                'content' => $data,
                'extends' => $data['extends'] ?? '_admin_base',
                'source_type' => $sourceType,
                'source_identifier' => 'custom-viewer_pdf',
            ];
            if ($row) {
                $row->fill($patch);
                if (method_exists($row, 'trashed') && $row->trashed() && method_exists($row, 'restore')) {
                    $row->restore();
                }
                $row->save();

                continue;
            }
            \App\Models\TemplateLayout::query()->create($patch);
        }
    }

    /**
     * @return list<int>
     */
    private static function adminTemplateIds(): array
    {
        $ids = [1];
        try {
            if (! class_exists(\App\Models\Template::class)) {
                return $ids;
            }
            $q = \App\Models\Template::query()->where('type', 'admin');
            if (class_exists(\App\Enums\ExtensionStatus::class)) {
                $q->where('status', \App\Enums\ExtensionStatus::Active->value);
            } else {
                $q->where('status', 'active');
            }
            $found = $q->pluck('id')->all();
            if ($found !== []) {
                return array_map('intval', $found);
            }
        } catch (\Throwable $e) {
        }

        return $ids;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function upsertTables(array $data): void
    {
        if (! class_exists(\Illuminate\Support\Facades\Schema::class)
            || ! class_exists(\Illuminate\Support\Facades\DB::class)) {
            return;
        }
        $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        if (! is_string($json) || $json === '') {
            return;
        }
        foreach (['template_layouts', 'layouts', 'g7_layouts'] as $table) {
            if (! \Illuminate\Support\Facades\Schema::hasTable($table)) {
                continue;
            }
            $cols = \Illuminate\Support\Facades\Schema::getColumnListing($table);
            if (! in_array('name', $cols, true) || ! in_array('content', $cols, true)) {
                continue;
            }
            $now = date('Y-m-d H:i:s');
            $q = \Illuminate\Support\Facades\DB::table($table)->where('name', self::LAYOUT_NAME);
            if (in_array('template_id', $cols, true)) {
                $q->where(function ($w) {
                    $w->where('template_id', 1)->orWhere('template_id', 0)->orWhereNull('template_id');
                });
            }
            $row = $q->first();
            $patch = [
                'name' => self::LAYOUT_NAME,
                'content' => $json,
            ];
            if (in_array('template_id', $cols, true)) {
                $patch['template_id'] = 1;
            }
            if (in_array('extends', $cols, true)) {
                $patch['extends'] = $data['extends'] ?? '_admin_base';
            }
            if (in_array('source_type', $cols, true)) {
                $patch['source_type'] = 'plugin';
            }
            if (in_array('source_identifier', $cols, true)) {
                $patch['source_identifier'] = 'custom-viewer_pdf';
            }
            if (in_array('updated_at', $cols, true)) {
                $patch['updated_at'] = $now;
            }
            if ($row && isset($row->id)) {
                \Illuminate\Support\Facades\DB::table($table)->where('id', $row->id)->update($patch);

                continue;
            }
            if (in_array('created_at', $cols, true)) {
                $patch['created_at'] = $now;
            }
            \Illuminate\Support\Facades\DB::table($table)->insert($patch);
        }
    }
}
