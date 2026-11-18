<?php
if (!defined('ABSPATH')) { exit; }
if (get_option('campus_dataset_version') === '1.0.0') {
    WP_CLI::success('Se conserva el contenido existente.');
} else {
    campus_seed();
    WP_CLI::success('Datos ficticios preparados.');
}
if (function_exists('campus_ci_seed') && get_option('campus_ci_version') !== '1.0.0') {
    campus_ci_seed();
    WP_CLI::success('Boletin (actividad 3.2) preparado.');
}
