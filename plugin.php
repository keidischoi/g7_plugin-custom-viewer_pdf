<?php

namespace Plugins\Custom\ViewerPdf;

use App\Extension\AbstractPlugin;
use Plugins\Custom\ViewerPdf\Support\SettingsLayoutRegistrar;

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
    /**
     * @return array<class-string>
     */
    public function getHookListeners(): array
    {
        return [
            \Plugins\Custom\ViewerPdf\Listeners\ViewerPdfLayoutListener::class,
        ];
    }

    public function activate(): bool
    {
        try {
            SettingsLayoutRegistrar::ensure();
        } catch (\Throwable $e) {
        }

        return parent::activate();
    }

    /**
     * @return array<string, callable>
     */
    public function upgrades(): array
    {
        return [
            '0.2.15' => static function (): void {
                SettingsLayoutRegistrar::ensure();
            },
            '0.2.16' => static function (): void {
                SettingsLayoutRegistrar::ensure();
            },
        ];
    }

    public function getConfigValues(): array
    {
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

    /**
     * @return array<string, array<string, mixed>>
     */
    public function getSettingsSchema(): array
    {
        return [
            'badge_icon' => [
                'type' => 'string',
                'default' => '📄',
                'label' => ['ko' => '배지 아이콘', 'en' => 'Badge icon'],
                'required' => false,
            ],
            'badge_label' => [
                'type' => 'string',
                'default' => 'PDF',
                'label' => ['ko' => '배지 글자', 'en' => 'Badge label'],
                'required' => false,
            ],
            'badge_order' => [
                'type' => 'integer',
                'min' => 0,
                'max' => 999,
                'default' => 20,
                'label' => ['ko' => 'PDF 정렬 번호', 'en' => 'PDF sort order'],
                'hint' => [
                    'ko' => '이 플러그인 배지만의 순서. 작을수록 위. 기본 20. 호스트는 window.__cdpViewerOrder[\'custom-viewer_pdf\'] 로 받는다.',
                    'en' => '이 플러그인 배지만의 순서. 작을수록 위. 기본 20. 호스트는 window.__cdpViewerOrder[\'custom-viewer_pdf\'] 로 받는다.',
                ],
                'required' => false,
            ],
            'default_scale' => [
                'type' => 'number',
                'default' => 1.15,
                'label' => ['ko' => '기본 배율', 'en' => 'Default scale'],
                'required' => false,
            ],
            'wheel_scroll_px' => [
                'type' => 'integer',
                'min' => 40,
                'max' => 800,
                'default' => 140,
                'label' => ['ko' => '휠 스크롤 양 (px)', 'en' => 'Wheel scroll (px)'],
                'required' => false,
            ],
            'show_print' => [
                'type' => 'boolean',
                'default' => true,
                'label' => ['ko' => '인쇄 버튼', 'en' => 'Print button'],
                'required' => false,
            ],
            'show_download' => [
                'type' => 'boolean',
                'default' => true,
                'label' => ['ko' => '다운로드 버튼', 'en' => 'Download button'],
                'required' => false,
            ],
            'show_zoom' => [
                'type' => 'boolean',
                'default' => true,
                'label' => ['ko' => '확대/축소', 'en' => 'Zoom'],
                'required' => false,
            ],
            'show_page_thumbs' => [
                'type' => 'boolean',
                'default' => true,
                'label' => ['ko' => '페이지 미리보기', 'en' => 'Page thumbnails'],
                'required' => false,
            ],
            'show_file_rail' => [
                'type' => 'boolean',
                'default' => true,
                'label' => ['ko' => '파일 목록 슬라이더', 'en' => 'File list rail'],
                'required' => false,
            ],
            'wheel_turns_page' => [
                'type' => 'boolean',
                'default' => false,
                'label' => ['ko' => '휠로 페이지 단위 이동', 'en' => 'Wheel changes page'],
                'required' => false,
            ],
        ];
    }
}
