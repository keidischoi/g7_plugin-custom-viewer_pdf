<?php

namespace Plugins\Custom\ViewerPdf\Listeners;

use App\Contracts\Extension\HookListenerInterface;
use Plugins\Custom\ViewerPdf\Support\ModulePresence;
use Plugins\Custom\ViewerPdf\Support\SettingsLayoutRegistrar;
use Plugins\Custom\ViewerPdf\Support\ViewerPdfSettings;

/**
 * Inject share-pdf.js onto custom-digital_product share/detail layouts.
 *
 * Uses layout scripts[] with a real /api/plugins/... src (optional).
 * Does NOT use fake component ids (G7 toasts missing components).
 * No-ops when host custom-digital_product is not active.
 */
class ViewerPdfLayoutListener implements HookListenerInterface
{
    private const SCRIPT_SRC = '/api/plugins/custom-viewer_pdf/assets/share-pdf.js?v=0.2.16';

    private const SCRIPT_SRC_NEEDLE = '/api/plugins/custom-viewer_pdf/assets/share-pdf';

    /** @var list<string> */
    private const TARGET_LAYOUTS = [
        'cdp_share_detail',
        'user_free_product_show',
    ];

    public static function getSubscribedHooks(): array
    {
        return [
            'core.layout.filter_child_data' => [
                'method' => 'filterChildLayout',
                'priority' => 60,
                'type' => 'filter',
                'sync' => true,
            ],
            'core.layout.filter_merged' => [
                'method' => 'filterMergedLayout',
                'priority' => 60,
                'type' => 'filter',
                'sync' => true,
            ],
            'core.layout_extension.after_apply' => [
                'method' => 'afterExtensions',
                'priority' => 60,
                'type' => 'filter',
                'sync' => true,
            ],
        ];
    }

    public function handle(...$args): void
    {
        try {
            SettingsLayoutRegistrar::ensure();
        } catch (\Throwable $e) {
        }
    }

    public function filterChildLayout(mixed $childLayout = null, mixed $parentLayout = null): mixed
    {
        try {
            SettingsLayoutRegistrar::ensure();

            return is_array($childLayout) ? $this->apply($childLayout) : $childLayout;
        } catch (\Throwable $e) {
            return $childLayout;
        }
    }

    public function filterMergedLayout(mixed $merged = null, mixed $parentLayout = null, mixed $childLayout = null): mixed
    {
        try {
            if (! is_array($merged)) {
                return $merged;
            }
            if (empty($merged['layout_name']) && is_array($childLayout) && ! empty($childLayout['layout_name'])) {
                $merged['layout_name'] = $childLayout['layout_name'];
            }

            return $this->apply($merged);
        } catch (\Throwable $e) {
            return $merged;
        }
    }

    public function afterExtensions(mixed $layout = null, mixed $templateId = null): mixed
    {
        try {
            return is_array($layout) ? $this->apply($layout) : $layout;
        } catch (\Throwable $e) {
            return $layout;
        }
    }

    /**
     * @param  array<string, mixed>  $layout
     * @return array<string, mixed>
     */
    private function apply(array $layout): array
    {
        if (! ModulePresence::hostDigitalProductActive()) {
            return $layout;
        }

        $name = (string) ($layout['layout_name'] ?? '');
        if ($name === '' || ! in_array($name, self::TARGET_LAYOUTS, true)) {
            return $layout;
        }

        return $this->ensureSharePdfScript($layout);
    }

    /**
     * @param  array<string, mixed>  $layout
     * @return array<string, mixed>
     */
    private function ensureSharePdfScript(array $layout): array
    {
        if (! isset($layout['scripts']) || ! is_array($layout['scripts'])) {
            $layout['scripts'] = [];
        }

        foreach ($layout['scripts'] as $script) {
            if (! is_array($script)) {
                continue;
            }
            $src = (string) ($script['src'] ?? '');
            if ($src !== '' && str_contains($src, self::SCRIPT_SRC_NEEDLE)) {
                return $layout;
            }
        }

        $json = json_encode(ViewerPdfSettings::get(), JSON_UNESCAPED_UNICODE);
        $layout['scripts'][] = [
            'src' => 'data:text/javascript,'.rawurlencode('window.__cdpPdfSettings='.$json.';'),
            'name' => 'custom-viewer_pdf.settings',
            'label' => 'PDF 뷰어 설정',
            'async' => false,
            'optional' => true,
            'required' => false,
            'failOnError' => false,
        ];

        $layout['scripts'][] = [
            'src' => self::SCRIPT_SRC,
            'name' => 'custom-viewer_pdf.share-pdf.js',
            'label' => 'PDF 뷰어',
            'async' => false,
            'optional' => true,
            'required' => false,
            'failOnError' => false,
            'errorHandling' => [
                '404' => ['handler' => 'suppress'],
                '500' => ['handler' => 'suppress'],
                'default' => ['handler' => 'suppress'],
            ],
            'onError' => ['handler' => 'suppress'],
        ];

        return $layout;
    }
}
