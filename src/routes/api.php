<?php

use Illuminate\Support\Facades\Route;
use Plugins\Custom\ViewerPdf\Http\Controllers\Admin\SettingsController;
use Plugins\Custom\ViewerPdf\Http\Controllers\Public\AssetController;

/*
| PluginRouteServiceProvider prefix: api/plugins/custom-viewer_pdf
|
| Public assets only — no catalog / checkout / admin UI.
*/

Route::get('assets/share-pdf.js', [AssetController::class, 'sharePdf'])
    ->middleware(['throttle:600,1'])
    ->name('assets.sharepdf');

Route::get('assets/settings.html', [AssetController::class, 'settingsPage'])
    ->middleware(['throttle:60,1'])
    ->name('assets.settings');

Route::get('settings', [SettingsController::class, 'show'])
    ->middleware(['throttle:120,1'])
    ->name('settings.show');

Route::get('admin/settings', [SettingsController::class, 'show'])
    ->middleware(['throttle:60,1'])
    ->name('admin.settings');

Route::post('admin/settings', [SettingsController::class, 'save'])
    ->middleware(['throttle:30,1'])
    ->name('admin.settings.save');

Route::put('admin/settings', [SettingsController::class, 'save'])
    ->middleware(['throttle:30,1'])
    ->name('admin.settings.put');

Route::put('settings', [SettingsController::class, 'save'])
    ->middleware(['throttle:30,1'])
    ->name('settings.put');
