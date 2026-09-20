<?php

namespace Plugins\Custom\ViewerPdf\Support;

/**
 * Soft presence checks — never throw; plugin must no-op cleanly.
 */
final class ModulePresence
{
    public static function isModuleActive(string $identifier): bool
    {
        try {
            if (! function_exists('app')) {
                return false;
            }

            $candidates = [];
            if (interface_exists(\App\Contracts\Extension\ModuleManagerInterface::class)) {
                $candidates[] = \App\Contracts\Extension\ModuleManagerInterface::class;
            }
            if (class_exists(\App\Extension\ModuleManager::class)) {
                $candidates[] = \App\Extension\ModuleManager::class;
            }

            foreach ($candidates as $class) {
                try {
                    if (! app()->bound($class)) {
                        continue;
                    }
                    $mm = app($class);
                    if (! is_object($mm) || ! method_exists($mm, 'getActiveModules')) {
                        continue;
                    }
                    foreach ($mm->getActiveModules() as $mod) {
                        if (is_object($mod) && method_exists($mod, 'getIdentifier')
                            && $mod->getIdentifier() === $identifier) {
                            return true;
                        }
                    }

                    return false;
                } catch (\Throwable $e) {
                    continue;
                }
            }

            if (class_exists(\App\Models\Module::class)) {
                $row = \App\Models\Module::query()->where('identifier', $identifier)->first();
                if (! $row) {
                    return false;
                }
                $status = strtolower((string) ($row->status ?? ''));
                if ($status !== '' && in_array($status, ['active', 'activated', 'enabled', '1'], true)) {
                    return true;
                }
                if (isset($row->is_active)) {
                    return (bool) $row->is_active;
                }
                if (isset($row->activated_at) && $row->activated_at) {
                    return true;
                }
            }
        } catch (\Throwable $e) {
            return false;
        }

        return false;
    }

    public static function hostDigitalProductActive(): bool
    {
        return self::isModuleActive('custom-digital_product');
    }
}
