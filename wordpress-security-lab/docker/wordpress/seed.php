<?php
if (!defined('ABSPATH')) { exit; }
if (get_option('campus_dataset_version') === '1.0.0') { WP_CLI::success('Se conserva el contenido existente.'); return; }
campus_seed();
WP_CLI::success('Datos ficticios preparados.');
