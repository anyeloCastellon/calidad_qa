<?php
$port = getenv('LAB_PORT') ?: '8088';
$host = $_SERVER['HTTP_HOST'] ?? ('localhost:' . $port);
if (PHP_SAPI !== 'cli' && !in_array($host, ['wordpress', 'wordpress:80', 'localhost', 'localhost:' . $port, '127.0.0.1:' . $port], true)) {
    http_response_code(400);
    exit('Host no permitido');
}
define('WP_HOME', 'http://' . $host);
define('WP_SITEURL', 'http://' . $host);
define('WP_ENVIRONMENT_TYPE', 'local');
define('DISALLOW_FILE_EDIT', true);
define('DISALLOW_FILE_MODS', true);
define('AUTOMATIC_UPDATER_DISABLED', true);
define('DISABLE_WP_CRON', true);
define('WP_HTTP_BLOCK_EXTERNAL', true);
define('WP_DEBUG_DISPLAY', false);
@ini_set('display_errors', '0');
