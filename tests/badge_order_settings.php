<?php

function storage_path(string $suffix = ''): string
{
    $base = sys_get_temp_dir().'/cvpdf-badge-order-test';
    if (! is_dir($base)) {
        mkdir($base, 0775, true);
    }

    return $suffix === '' ? $base : $base.'/'.ltrim($suffix, '/');
}

require __DIR__.'/../src/Support/ViewerPdfSettings.php';

use Plugins\Custom\ViewerPdf\Support\ViewerPdfSettings;

function expect($cond, $msg): void
{
    if (! $cond) {
        fwrite(STDERR, "FAIL: {$msg}\n");
        exit(1);
    }
    echo "ok  {$msg}\n";
}

$defaults = ViewerPdfSettings::defaults();
expect(($defaults['badge_order'] ?? null) === 20, 'defaults badge_order is 20');

$dir = storage_path('app/plugins/custom-viewer_pdf');
if (! is_dir($dir)) {
    mkdir($dir, 0775, true);
}
$settingsFile = $dir.'/settings.json';
@unlink($settingsFile);

$got = ViewerPdfSettings::get();
expect(($got['badge_order'] ?? null) === 20, 'get() default badge_order is 20');

$saved = ViewerPdfSettings::put(['badge_order' => 7]);
expect($saved['badge_order'] === 7, 'put() stores 7');
expect(ViewerPdfSettings::get()['badge_order'] === 7, 'get() reads stored 7');

$saved = ViewerPdfSettings::put(['badge_order' => -4]);
expect($saved['badge_order'] === 0, 'put() clamps below 0 to 0');

$saved = ViewerPdfSettings::put(['badge_order' => 1500]);
expect($saved['badge_order'] === 999, 'put() clamps above 999 to 999');

$saved = ViewerPdfSettings::put(['badge_order' => '33']);
expect($saved['badge_order'] === 33 && is_int($saved['badge_order']), 'put() stores integer');

file_put_contents($settingsFile, json_encode(['badge_order' => 2000], JSON_PRETTY_PRINT));
expect(ViewerPdfSettings::get()['badge_order'] === 999, 'get() clamps stored value to 999');

@unlink($settingsFile);
