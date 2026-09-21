<?php

namespace Plugins\Custom\ViewerPdf;

use App\Extension\AbstractPlugin;

/**
 * Thin Event-Hook PDF viewer plugin for custom-digital_product.
 *
 * Owns only share-pdf.js and injects it on host share/detail layouts.
 * Does NOT provide catalog, checkout, orders, downloads, or mypage tabs.
 * Soft-requires custom-digital_product — if the host is off, listeners no-op.
 *
 * Identifier is custom-viewer_pdf (mirrors custom-viewer3d naming).
 */
class Plugin extends AbstractPlugin
{
    public function __construct()
    {
        try {
            \Plugins\Custom\ViewerPdf\Support\SettingsLayoutRegistrar::ensure();
        } catch (\Throwable $e) {
        }
    }

    /**
     * @return array<class-string>
     */
    public function getHookListeners(): array
    {
        return [
            \Plugins\Custom\ViewerPdf\Listeners\ViewerPdfLayoutListener::class,
        ];
    }

    public function getConfigValues(): array
    {
        try {
            return \Plugins\Custom\ViewerPdf\Support\ViewerPdfSettings::get();
        } catch (\Throwable $e) {
            return [
                'badge_icon' => '📄',
                'badge_label' => 'PDF',
                'badge_order' => 20,
                'default_scale' => 1.15,
                'wheel_scroll_px' => 140,
                'show_print' => true,
                'show_download' => true,
                'show_zoom' => true,
                'show_page_thumbs' => true,
                'show_file_rail' => true,
                'wheel_turns_page' => false,
            ];
        }
    }
}
