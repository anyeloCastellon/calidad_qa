<?php
/**
 * Plugin Name: Campus Aula
 * Description: Biblioteca, comunidad y agenda del portal Campus Abierto.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) { exit; }

function campus_schema() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();
    dbDelta("CREATE TABLE {$wpdb->prefix}campus_recursos (
        id bigint(20) unsigned NOT NULL,
        titulo varchar(160) NOT NULL,
        descripcion text NOT NULL,
        categoria varchar(80) NOT NULL,
        PRIMARY KEY  (id)
    ) $charset;");
    dbDelta("CREATE TABLE {$wpdb->prefix}campus_muro (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        autor varchar(80) NOT NULL,
        mensaje text NOT NULL,
        fecha datetime NOT NULL,
        PRIMARY KEY  (id)
    ) $charset;");
    dbDelta("CREATE TABLE {$wpdb->prefix}campus_reservas (
        id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        taller varchar(160) NOT NULL,
        fecha datetime NOT NULL,
        sala varchar(80) NOT NULL,
        nota text NOT NULL,
        PRIMARY KEY  (id),
        KEY user_id (user_id)
    ) $charset;");
}
register_activation_hook(__FILE__, 'campus_schema');

function campus_seed($reset = false) {
    global $wpdb;
    campus_schema();
    $users = [
        ['redactor', 'Aula2026', 'editor', 'Equipo editorial'],
        ['estudiante.uno', 'EstudianteUno!2026', 'subscriber', 'Camila Torres'],
        ['estudiante.dos', 'EstudianteDos!2026', 'subscriber', 'Diego Rojas'],
    ];
    $ids = [];
    foreach ($users as [$login, $password, $role, $name]) {
        $existing = get_user_by('login', $login);
        $data = ['user_login' => $login, 'user_pass' => $password, 'user_email' => $login . '@campus.example', 'display_name' => $name, 'role' => $role];
        if ($existing) { $data['ID'] = $existing->ID; $user_id = wp_update_user($data); }
        else { $user_id = wp_insert_user($data); }
        if (is_wp_error($user_id)) { throw new RuntimeException('No se pudo preparar una cuenta del portal.'); }
        $ids[$login] = $user_id;
        if ($reset) { WP_Session_Tokens::get_instance($user_id)->destroy_all(); }
    }
    foreach (['campus_recursos', 'campus_muro', 'campus_reservas'] as $suffix) {
        $wpdb->query("TRUNCATE TABLE {$wpdb->prefix}{$suffix}");
    }
    $resources = [
        [1, 'Escribir para la web', 'Una introducción a la escritura clara, los títulos y la estructura de una noticia.', 'Comunicación'],
        [2, 'Fotografía con luz natural', 'Puntos de partida para observar la luz, encuadrar y construir una serie de imágenes.', 'Cultura'],
        [3, 'Datos para tomar decisiones', 'Conceptos básicos para organizar información y preparar una visualización.', 'Tecnología'],
        [4, 'Organizar el trabajo en equipo', 'Ideas para acordar objetivos, distribuir tareas y revisar avances.', 'Comunidad'],
    ];
    foreach ($resources as [$id, $title, $description, $category]) {
        $wpdb->insert($wpdb->prefix . 'campus_recursos', ['id' => $id, 'titulo' => $title, 'descripcion' => $description, 'categoria' => $category]);
    }
    $wpdb->insert($wpdb->prefix . 'campus_muro', ['autor' => 'Equipo editorial', 'mensaje' => 'Ya están abiertas las inscripciones a los talleres de noviembre.', 'fecha' => '2026-10-28 09:00:00']);
    $wpdb->insert($wpdb->prefix . 'campus_muro', ['autor' => 'Comunidad Campus', 'mensaje' => 'La biblioteca incorpora nuevos recursos de comunicación y tecnología.', 'fecha' => '2026-10-28 10:00:00']);
    foreach ([
        [101, 'estudiante.uno', 'Fotografía con luz natural', '2026-11-05 16:00:00', 'Sala 203', 'Solicité un puesto cerca de la ventana.'],
        [102, 'estudiante.uno', 'Escritura creativa', '2026-11-12 15:00:00', 'Biblioteca', 'Llevaré un borrador de mi relato.'],
        [201, 'estudiante.dos', 'Visualización de datos', '2026-11-06 11:00:00', 'Laboratorio 2', 'Reservé un equipo con acceso a lector de pantalla.'],
        [202, 'estudiante.dos', 'Trabajo colaborativo', '2026-11-13 10:00:00', 'Sala 108', 'Necesito confirmar el horario con mi tutor.'],
    ] as [$id, $login, $workshop, $date, $room, $note]) {
        $wpdb->insert($wpdb->prefix . 'campus_reservas', ['id' => $id, 'user_id' => $ids[$login], 'taller' => $workshop, 'fecha' => $date, 'sala' => $room, 'nota' => $note]);
    }
    foreach ([
        'inicio' => ['Campus Abierto', '[campus_inicio]'],
        'biblioteca' => ['Biblioteca', '[campus_biblioteca]'],
        'muro' => ['Muro de la comunidad', '[campus_muro]'],
        'mi-agenda' => ['Mi agenda', '[campus_agenda]'],
        'perfil' => ['Mi perfil', '[campus_perfil]'],
    ] as $slug => [$title, $content]) {
        $existing = get_page_by_path($slug);
        $data = ['post_type' => 'page', 'post_name' => $slug, 'post_title' => $title, 'post_content' => $content, 'post_status' => 'publish', 'post_author' => $ids['redactor']];
        if ($existing) { $data['ID'] = $existing->ID; }
        $id = wp_insert_post($data);
        if ($slug === 'inicio') { update_option('page_on_front', $id); update_option('show_on_front', 'page'); }
    }
    foreach ([
        ['talleres-de-noviembre', 'Un mes para aprender algo nuevo', 'Los talleres de noviembre reúnen fotografía, escritura y tecnología. Cada propuesta es una oportunidad para compartir experiencias y descubrir otras maneras de mirar.'],
        ['biblioteca-abierta', 'La biblioteca también se comparte', 'Encuentra materiales breves para comenzar un proyecto, trabajar en equipo o preparar tu próxima publicación. Nuestra colección crece con la comunidad.'],
    ] as [$slug, $title, $content]) {
        $existing = get_page_by_path($slug, OBJECT, 'post');
        $data = ['post_type' => 'post', 'post_name' => $slug, 'post_title' => $title, 'post_content' => $content, 'post_status' => 'publish', 'post_author' => $ids['redactor'], 'comment_status' => 'closed'];
        if ($existing) { $data['ID'] = $existing->ID; }
        wp_insert_post($data);
    }
    update_option('blogdescription', 'Historias, recursos y encuentros para aprender en comunidad.');
    update_option('users_can_register', 0);
    update_option('campus_dataset_version', '1.0.0');
    flush_rewrite_rules();
}

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('campus-aula', plugins_url('campus-aula.css', __FILE__), [], '1.0.0');
});

add_action('template_redirect', function () {
    if (!is_page('muro') || $_SERVER['REQUEST_METHOD'] !== 'POST') { return; }
    if (!isset($_POST['campus_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['campus_nonce'])), 'campus_mensaje')) {
        wp_die('Actualiza la página e intenta nuevamente.', 'Solicitud no válida', ['response' => 403]);
    }
    $author = isset($_POST['autor']) && is_string($_POST['autor']) ? sanitize_text_field(wp_unslash($_POST['autor'])) : '';
    $message = isset($_POST['mensaje']) && is_string($_POST['mensaje']) ? trim(wp_unslash($_POST['mensaje'])) : '';
    if (!$author || !$message || mb_strlen($author) > 80 || mb_strlen($message) > 600) {
        wp_die('Indica tu nombre y un mensaje de hasta 600 caracteres.', 'Revisa el mensaje', ['response' => 422]);
    }
    global $wpdb;
    $wpdb->insert($wpdb->prefix . 'campus_muro', ['autor' => $author, 'mensaje' => $message, 'fecha' => current_time('mysql')]);
    wp_safe_redirect(home_url('/muro/?publicado=1'));
    exit;
});

function campus_intro($eyebrow, $title, $text) {
    return '<div class="page-intro"><p class="eyebrow">' . esc_html($eyebrow) . '</p><h1>' . esc_html($title) . '</h1><p class="lede">' . esc_html($text) . '</p></div>';
}
function campus_login_prompt() {
    return '<section class="surface"><h2>Tu espacio personal</h2><p>Inicia sesión para consultar tu información.</p><a class="button" href="' . esc_url(wp_login_url(get_permalink())) . '">Iniciar sesión</a></section>';
}
function campus_inicio() {
    ob_start(); ?>
    <section class="hero"><div><p class="eyebrow">Una comunidad que aprende</p><h1>Las buenas ideas<br>empiezan con<br>un encuentro.</h1><p>Historias que inspiran, recursos para crear y talleres para compartir lo que sabes.</p><a class="button light" href="<?php echo esc_url(home_url('/biblioteca/')); ?>">Explorar la biblioteca <span aria-hidden="true">↗</span></a></div><div class="hero-art" aria-hidden="true"><span class="art-disc"></span><span class="art-book"></span><span class="art-line"></span><span class="art-caption">APRENDER<br>CREAR<br>COMPARTIR</span><span class="art-dot"></span></div></section>
    <section><div class="section-heading"><div><p class="eyebrow">Lo que está pasando</p><h2>En nuestra comunidad</h2></div><a href="<?php echo esc_url(home_url('/muro/')); ?>">Ver el muro <span aria-hidden="true">→</span></a></div><div class="news-grid"><?php
    $posts = get_posts(['numberposts' => 2, 'author' => get_user_by('login', 'redactor')->ID, 'orderby' => 'ID', 'order' => 'ASC']);
    foreach ($posts as $index => $post) { ?>
        <article class="news-card"><div class="news-art art-<?php echo (int)$index; ?>" aria-hidden="true"><span><?php echo $index ? 'Aa' : '↗'; ?></span></div><div><p class="eyebrow"><?php echo $index ? 'Biblioteca' : 'Encuentros'; ?></p><h3><a href="<?php echo esc_url(get_permalink($post)); ?>"><?php echo esc_html($post->post_title); ?></a></h3><p><?php echo esc_html(wp_trim_words($post->post_content, 24)); ?></p><a class="text-link" href="<?php echo esc_url(get_permalink($post)); ?>">Leer la historia →</a></div></article>
    <?php } ?></div></section>
    <section class="agenda-banner"><div><p class="eyebrow">Haz espacio para algo nuevo</p><h2>Tu próximo taller<br>te está esperando.</h2><p>Consulta tus inscripciones y los detalles de cada encuentro.</p></div><a class="button" href="<?php echo esc_url(home_url('/mi-agenda/')); ?>">Abrir mi agenda →</a></section>
    <?php return ob_get_clean();
}
add_shortcode('campus_inicio', 'campus_inicio');

function campus_biblioteca() {
    global $wpdb;
    $raw = isset($_GET['recurso']) && is_string($_GET['recurso']) ? substr(wp_unslash($_GET['recurso']), 0, 400) : null;
    $wpdb->suppress_errors(true);
    $rows = $raw !== null ? $wpdb->get_results("SELECT id,titulo,descripcion,categoria FROM {$wpdb->prefix}campus_recursos WHERE id = $raw") : $wpdb->get_results("SELECT id,titulo,descripcion,categoria FROM {$wpdb->prefix}campus_recursos ORDER BY id");
    ob_start();
    echo campus_intro('Para comenzar un proyecto', 'Biblioteca', 'Materiales breves para explorar, crear y trabajar con otras personas.'); ?>
    <form class="search-form" method="get"><label for="resource-code">Código del recurso</label><div><input id="resource-code" name="recurso" value="<?php echo esc_attr($raw ?? ''); ?>" placeholder="Ejemplo: 1"><button type="submit">Consultar</button></div></form>
    <div class="resource-grid"><?php foreach ($rows ?: [] as $row) { ?>
        <article class="surface resource"><p class="eyebrow"><?php echo esc_html($row->categoria); ?></p><span class="resource-number"><?php echo sprintf('%02d', (int)$row->id); ?></span><h2><?php echo esc_html($row->titulo); ?></h2><p><?php echo esc_html($row->descripcion); ?></p><a href="<?php echo esc_url(add_query_arg('recurso', $row->id, home_url('/biblioteca/'))); ?>">Consultar recurso →</a></article>
    <?php } ?></div><?php if (!$rows) { echo '<div class="surface"><h2>No se encontraron recursos</h2><p>Prueba con otro código o vuelve a la biblioteca.</p></div>'; }
    return ob_get_clean();
}
add_shortcode('campus_biblioteca', 'campus_biblioteca');

function campus_muro() {
    global $wpdb;
    $rows = $wpdb->get_results("SELECT autor,mensaje,fecha FROM {$wpdb->prefix}campus_muro ORDER BY id DESC LIMIT 12");
    ob_start();
    echo campus_intro('Conversaciones que nos conectan', 'Muro de la comunidad', 'Comparte una idea, una invitación o algo que te gustaría aprender.'); ?>
    <div class="community-layout"><section class="surface"><h2>Publicar un mensaje</h2><form class="stack" method="post"><?php wp_nonce_field('campus_mensaje', 'campus_nonce'); ?><label for="author-name">Tu nombre</label><input id="author-name" name="autor" required maxlength="80"><label for="message-text">Mensaje</label><textarea id="message-text" name="mensaje" rows="5" required maxlength="600"></textarea><button type="submit">Publicar mensaje</button></form></section><section aria-label="Mensajes recientes"><h2>Mensajes recientes</h2><div class="message-list"><?php foreach ($rows as $row) { ?>
        <article class="surface message"><div class="message-author"><span class="avatar" aria-hidden="true"><?php echo esc_html(mb_substr($row->autor, 0, 1)); ?></span><div><strong><?php echo esc_html($row->autor); ?></strong><time><?php echo esc_html(mysql2date('d/m/Y H:i', $row->fecha)); ?></time></div></div><div class="message-body"><?php echo $row->mensaje; ?></div></article>
    <?php } ?></div></section></div><?php return ob_get_clean();
}
add_shortcode('campus_muro', 'campus_muro');

function campus_agenda() {
    global $wpdb;
    $intro = campus_intro('Aprender también es encontrarse', 'Mi agenda', 'Tus inscripciones a talleres y actividades de Campus Abierto.');
    if (!is_user_logged_in()) { return $intro . campus_login_prompt(); }
    ob_start(); echo $intro;
    if (isset($_GET['reserva'])) {
        $id = absint($_GET['reserva']);
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}campus_reservas WHERE id=%d", $id));
        if (!$row) { echo '<section class="surface"><h2>Reserva no disponible</h2></section>'; }
        else {
            $owner = get_userdata($row->user_id); ?>
            <a class="back-link" href="<?php echo esc_url(home_url('/mi-agenda/')); ?>">← Volver a mi agenda</a><section class="surface reservation"><p class="eyebrow">Inscripción <?php echo (int)$row->id; ?></p><h2><?php echo esc_html($row->taller); ?></h2><dl class="detail-grid"><?php foreach (['Estudiante' => $owner ? $owner->display_name : '', 'Correo' => $owner ? $owner->user_email : '', 'Fecha y hora' => mysql2date('d/m/Y H:i', $row->fecha), 'Lugar' => $row->sala, 'Observaciones personales' => $row->nota] as $label => $value) { ?><div><dt><?php echo esc_html($label); ?></dt><dd><?php echo esc_html($value); ?></dd></div><?php } ?></dl></section>
        <?php }
    } else {
        $rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}campus_reservas WHERE user_id=%d ORDER BY fecha,id", get_current_user_id())); ?>
        <p class="account-caption">Sesión de <?php echo esc_html(wp_get_current_user()->display_name); ?></p><div class="reservation-list"><?php foreach ($rows as $row) { ?>
            <article class="surface reservation-summary"><div><p class="eyebrow"><?php echo esc_html(mysql2date('d/m/Y H:i', $row->fecha)); ?></p><h2><?php echo esc_html($row->taller); ?></h2><p><?php echo esc_html($row->sala); ?></p></div><a class="button outline" href="<?php echo esc_url(add_query_arg('reserva', $row->id, home_url('/mi-agenda/'))); ?>">Ver inscripción →</a></article>
        <?php } ?></div><?php if (!$rows) { echo '<section class="surface"><h2>No tienes inscripciones</h2></section>'; }
    }
    return ob_get_clean();
}
add_shortcode('campus_agenda', 'campus_agenda');

function campus_perfil() {
    $intro = campus_intro('Tu cuenta en Campus Abierto', 'Mi perfil', 'Información de contacto de tu cuenta personal.');
    if (!is_user_logged_in()) { return $intro . campus_login_prompt(); }
    $user = wp_get_current_user();
    $html = $intro . '<section class="surface"><dl class="detail-grid">';
    foreach (['Nombre' => $user->display_name, 'Nombre de usuario' => $user->user_login, 'Correo electrónico' => $user->user_email] as $label => $value) {
        $html .= '<div><dt>' . esc_html($label) . '</dt><dd>' . esc_html($value) . '</dd></div>';
    }
    return $html . '</dl></section>';
}
add_shortcode('campus_perfil', 'campus_perfil');

add_action('rest_api_init', function () {
    register_rest_route('campus/v1', '/status', [
        'methods' => 'GET', 'permission_callback' => '__return_true',
        'callback' => function () {
            global $wpdb;
            $ready = get_option('campus_dataset_version') === '1.0.0';
            foreach (['campus_recursos', 'campus_muro', 'campus_reservas'] as $suffix) {
                $table = $wpdb->prefix . $suffix;
                $ready = $ready && $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table))) === $table;
            }
            return new WP_REST_Response(['status' => $ready ? 'ready' : 'not_ready', 'build' => '1.0.0'], $ready ? 200 : 503);
        },
    ]);
});
