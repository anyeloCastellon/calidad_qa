<?php
if (!defined('ABSPATH') || !defined('WP_CLI')) { exit; }
campus_seed(true);
WP_CLI::success('Datos de Campus Abierto restaurados y sesiones invalidadas.');
