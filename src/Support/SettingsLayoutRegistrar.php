<?php

namespace Plugins\Custom\ViewerPdf\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * G7 admin plugin settings UI fetches layout by
 * template_id + name=custom-viewer_pdf.plugin_settings.
 * Register that row so the 설정 화면 opens without touching templates.
 */
final class SettingsLayoutRegistrar
{
    public const LAYOUT_NAME = 'custom-viewer_pdf.plugin_settings';

    public static function ensure(): void
    {
        static $done = false;
        if ($done) {
            return;
        }
        $done = true;
        try {
            $json = self::payload();
            if ($json === '') {
                return;
            }
            foreach (['layouts', 'g7_layouts', 'template_layouts'] as $table) {
                if (! Schema::hasTable($table)) {
                    continue;
                }
                self::upsert($table, $json);
            }
        } catch (\Throwable $e) {
        }
    }

    public static function payloadArray(): ?array
    {
        $paths = [
            dirname(__DIR__, 2).'/resources/layouts/custom-viewer_pdf.plugin_settings.json',
            dirname(__DIR__, 2).'/resources/layouts/admin/plugin_settings.json',
        ];
        foreach ($paths as $path) {
            if (! is_file($path)) {
                continue;
            }
            $data = json_decode((string) file_get_contents($path), true);
            if (! is_array($data) || ! isset($data['slots'])) {
                continue;
            }
            $data['layout_name'] = self::LAYOUT_NAME;
            $data['name'] = self::LAYOUT_NAME;
            if (! isset($data['components']) || ! is_array($data['components'])) {
                $data['components'] = [];
            }
            unset($data['init_actions']);

            return $data;
        }

        return null;
    }

    private static function payload(): string
    {
        $data = self::payloadArray();
        if ($data === null) {
            return '';
        }

        return json_encode($data, JSON_UNESCAPED_UNICODE) ?: '';
    }

    private static function upsert(string $table, string $json): void
    {
        $cols = Schema::getColumnListing($table);
        $nameCol = self::firstCol($cols, ['name', 'layout_name', 'key']);
        if ($nameCol === null) {
            return;
        }
        $tplCol = self::firstCol($cols, ['template_id', 'templateId', 'admin_template_id']);
        $dataCol = self::firstCol($cols, ['data', 'content', 'layout', 'json', 'body', 'payload']);
        $now = date('Y-m-d H:i:s');

        $q = DB::table($table)->where($nameCol, self::LAYOUT_NAME);
        if ($tplCol) {
            $q->where(function ($w) use ($tplCol) {
                $w->where($tplCol, 1)->orWhere($tplCol, 0)->orWhereNull($tplCol);
            });
        }
        $row = $q->first();
        $patch = [$nameCol => self::LAYOUT_NAME];
        if ($tplCol) {
            $patch[$tplCol] = 1;
        }
        if ($dataCol) {
            $patch[$dataCol] = $json;
        }
        if (in_array('updated_at', $cols, true)) {
            $patch['updated_at'] = $now;
        }
        if ($row) {
            $idCol = self::firstCol($cols, ['id']);
            if ($idCol) {
                DB::table($table)->where($idCol, $row->{$idCol})->update($patch);
            }

            return;
        }
        if (in_array('created_at', $cols, true)) {
            $patch['created_at'] = $now;
        }
        if (in_array('type', $cols, true)) {
            $patch['type'] = 'page';
        }
        if (in_array('status', $cols, true)) {
            $patch['status'] = 'active';
        }
        DB::table($table)->insert($patch);
    }

    /**
     * @param  list<string>  $cols
     * @param  list<string>  $want
     */
    private static function firstCol(array $cols, array $want): ?string
    {
        foreach ($want as $c) {
            if (in_array($c, $cols, true)) {
                return $c;
            }
        }

        return null;
    }
}
