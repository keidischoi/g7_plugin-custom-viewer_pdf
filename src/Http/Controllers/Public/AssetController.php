<?php

namespace Plugins\Custom\ViewerPdf\Http\Controllers\Public;

use Illuminate\Http\Response;
use Illuminate\Routing\Controller;

/**
 * Serve share-pdf.js from resources/assets.
 *
 * Controllers live under Http/Controllers/Public → dirname(__DIR__, 4) = plugin root.
 */
class AssetController extends Controller
{
    public function sharePdf(): Response
    {
        return $this->jsFile('share-pdf.js');
    }

    public function settingsPage(): Response
    {
        $path = $this->resolveAssetPath('settings.html');
        $html = ($path && is_file($path)) ? (string) file_get_contents($path) : $this->fallbackSettingsHtml();

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-store',
        ]);
    }

    private function fallbackSettingsHtml(): string
    {
        return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>PDF 뷰어 설정</title></head><body style="font-family:sans-serif;background:#111827;color:#e5e7eb;padding:24px"><h1>PDF 뷰어 설정</h1><p>settings.html 파일이 없습니다. 플러그인 resources/assets/settings.html 을 업로드하세요.</p><p>저장 API: /api/plugins/custom-viewer_pdf/admin/settings</p></body></html>';
    }

    private function jsFile(string $filename): Response
    {
        $path = $this->resolveAssetPath($filename);
        if ($path === null) {
            return $this->jsResponse('/* custom-viewer_pdf asset missing: '.$filename.' */');
        }

        try {
            return $this->jsResponse((string) file_get_contents($path));
        } catch (\Throwable $e) {
            return $this->jsResponse('/* custom-viewer_pdf read error */');
        }
    }

    private function jsResponse(string $js): Response
    {
        return response($js, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
            'Pragma' => 'no-cache',
        ]);
    }

    private function resolveAssetPath(string $relative): ?string
    {
        $candidates = [
            dirname(__DIR__, 4).'/resources/assets/'.$relative,
            dirname(__DIR__, 3).'/resources/assets/'.$relative,
        ];
        if (function_exists('base_path')) {
            $candidates[] = base_path('plugins/custom-viewer_pdf/resources/assets/'.$relative);
            $candidates[] = base_path('plugins/_bundled/custom-viewer_pdf/resources/assets/'.$relative);
        }
        foreach ($candidates as $candidate) {
            if (is_string($candidate) && is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
