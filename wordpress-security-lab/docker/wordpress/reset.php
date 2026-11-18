<?php
if (!defined('ABSPATH') || !defined('WP_CLI')) { exit; }
campus_seed(true);
if (function_exists('campus_ci_seed')) { campus_ci_seed(true); }
if (function_exists('campus_blog_seed')) { campus_blog_seed(true); }
WP_CLI::success('Datos de Campus Abierto restaurados y sesiones invalidadas.');
