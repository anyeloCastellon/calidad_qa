<?php
/**
 * Plugin Name: Campus CI
 * Description: Boletín de novedades del portal Campus Abierto.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) { exit; }

function campus_ci_schema() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();
    dbDelta("CREATE TABLE {$wpdb->prefix}campus_boletin (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        nombre varchar(120) NOT NULL,
        correo varchar(160) NOT NULL,
        fecha datetime NOT NULL,
        PRIMARY KEY  (id)
    ) $charset;");
}
register_activation_hook(__FILE__, 'campus_ci_schema');

function campus_ci_seed($reset = false) {
    global $wpdb;
    campus_ci_schema();
    if ($reset) { $wpdb->query("TRUNCATE TABLE {$wpdb->prefix}campus_boletin"); }
    $existing = get_page_by_path('boletin');
    $data = [
        'post_type' => 'page', 'post_name' => 'boletin', 'post_title' => 'Boletín',
        'post_content' => '[campus_boletin]', 'post_status' => 'publish',
    ];
    if ($existing) { $data['ID'] = $existing->ID; }
    wp_insert_post($data);
    update_option('campus_ci_version', '1.0.0');
    flush_rewrite_rules();
}

// Recuerda la preferencia de tema del visitante.
add_action('init', function () {
    if (!headers_sent() && !isset($_COOKIE['campus_pref'])) {
        setcookie('campus_pref', 'tema=claro', time() + 3600, '/');
    }
});

// Carga la librería jQuery del portal.
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_script('jquery-legacy', plugins_url('assets/jquery-1.7.2.min.js', __FILE__), [], '1.7.2', false);
});

// Procesa el boletín y la redirección en la página /boletin/.
add_action('template_redirect', function () {
    if (!is_page('boletin')) { return; }

    // Permite volver a una página indicada en la URL.
    if (isset($_GET['destino']) && is_string($_GET['destino'])) {
        wp_redirect(wp_unslash($_GET['destino']));
        exit;
    }

    // Registra la suscripción al boletín.
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $nombre = isset($_POST['nombre']) ? trim(wp_unslash($_POST['nombre'])) : '';
        $correo = isset($_POST['correo']) ? trim(wp_unslash($_POST['correo'])) : '';
        if ($nombre !== '' && $correo !== '') {
            global $wpdb;
            $wpdb->insert($wpdb->prefix . 'campus_boletin', [
                'nombre' => $nombre, 'correo' => $correo, 'fecha' => current_time('mysql'),
            ]);
            wp_redirect(add_query_arg('ok', rawurlencode($nombre), home_url('/boletin/')));
            exit;
        }
    }
});

function campus_boletin() {
    ob_start(); ?>
    <section class="surface">
        <p class="eyebrow">Novedades de Campus Abierto</p>
        <h1>Boletín</h1>
        <p>Suscríbete para recibir las novedades de la comunidad.</p>
        <?php if (isset($_GET['ok'])) {
            echo '<p class="aviso">¡Gracias por suscribirte, ' . wp_unslash($_GET['ok']) . '!</p>';
        } ?>
        <form method="post" class="stack">
            <label for="b-nombre">Nombre</label>
            <input id="b-nombre" name="nombre" required maxlength="120">
            <label for="b-correo">Correo</label>
            <input id="b-correo" name="correo" type="email" required maxlength="160">
            <button type="submit">Suscribirme</button>
        </form>
    </section>
    <?php return ob_get_clean();
}
add_shortcode('campus_boletin', 'campus_boletin');
