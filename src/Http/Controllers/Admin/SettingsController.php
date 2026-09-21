<?php

namespace Plugins\Custom\ViewerPdf\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Plugins\Custom\ViewerPdf\Support\ViewerPdfSettings;

class SettingsController extends Controller
{
    public function show(Request $request)
    {
        $s = ViewerPdfSettings::get();
        if ($request->query('html') === '1') {
            return $this->html($s);
        }

        return response()->json($s);
    }

    public function save(Request $request)
    {
        $payload = $request->all();
        foreach (['data', 'settings', 'form', 'values', 'config'] as $wrap) {
            if (isset($payload[$wrap]) && is_array($payload[$wrap])) {
                $payload = $payload[$wrap];
                break;
            }
        }

        $saved = ViewerPdfSettings::put($payload);

        return response()->json($saved);
    }

    /**
     * @param  array<string, mixed>  $s
     */
    private function html(array $s)
    {
        $h = function ($v) {
            return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
        };
        $chk = function ($k) use ($s) {
            return ! empty($s[$k]) ? 'checked' : '';
        };

        $html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
        $html .= '<title>PDF 뷰어 설정</title>';
        $html .= '<style>body{font-family:sans-serif;background:#111827;color:#e5e7eb;margin:0;padding:24px}';
        $html .= '.card{max-width:560px;margin:0 auto;background:#1f2937;border-radius:12px;padding:20px}';
        $html .= 'label{display:block;margin:12px 0 4px}input[type=text],input[type=number]{width:100%;padding:8px;border-radius:8px;border:0}';
        $html .= 'button{margin-top:16px;padding:10px 16px;border:0;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer}';
        $html .= '.row{display:flex;align-items:center;gap:8px;margin:8px 0}</style></head><body><div class="card">';
        $html .= '<h1 style="margin-top:0;font-size:20px">PDF 뷰어 설정</h1>';
        $html .= '<form method="post" action="'.e(url('/api/plugins/custom-viewer_pdf/admin/settings')).'">';
        $html .= '<label>배지 아이콘</label><input name="badge_icon" value="'.$h($s['badge_icon']).'">';
        $html .= '<label>배지 글자</label><input name="badge_label" value="'.$h($s['badge_label']).'">';
        $html .= '<label>PDF 정렬 번호</label><input name="badge_order" type="number" step="1" min="0" max="999" value="'.$h($s['badge_order'] ?? 20).'">';
        $html .= '<label>기본 배율</label><input name="default_scale" type="number" step="0.05" min="0.5" max="3" value="'.$h($s['default_scale']).'">';
        $html .= '<label>휠 스크롤 양 (px, 작을수록 천천히)</label><input name="wheel_scroll_px" type="number" step="10" min="40" max="800" value="'.$h($s['wheel_scroll_px'] ?? 140).'">';
        $html .= '<div class="row"><input type="checkbox" name="show_print" value="1" '.$chk('show_print').'> 인쇄 버튼</div>';
        $html .= '<div class="row"><input type="checkbox" name="show_download" value="1" '.$chk('show_download').'> 다운로드 버튼</div>';
        $html .= '<div class="row"><input type="checkbox" name="show_zoom" value="1" '.$chk('show_zoom').'> 확대/축소</div>';
        $html .= '<div class="row"><input type="checkbox" name="show_page_thumbs" value="1" '.$chk('show_page_thumbs').'> 페이지 미리보기</div>';
        $html .= '<div class="row"><input type="checkbox" name="show_file_rail" value="1" '.$chk('show_file_rail').'> 파일 목록 슬라이더</div>';
        $html .= '<div class="row"><input type="checkbox" name="wheel_turns_page" value="1" '.$chk('wheel_turns_page').'> 휠로 페이지 넘김</div>';
        $html .= '<button type="submit">저장</button></form>';
        $html .= '<p style="opacity:.7;font-size:12px;margin-top:16px">저장 후 공유 페이지를 새로고침하면 바로 반영됩니다.</p>';
        $html .= '</div></body></html>';

        return response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }
}
