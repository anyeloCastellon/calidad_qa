<!doctype html>
<html <?php language_attributes(); ?>>
<head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><?php wp_head(); ?></head>
<body <?php body_class(); ?>><?php wp_body_open(); ?>
<a class="skip" href="#contenido">Ir al contenido</a>
<header class="site-header"><a class="brand" href="<?php echo esc_url(home_url('/')); ?>"><span class="brand-mark" aria-hidden="true">↗</span>Campus Abierto</a><nav class="main-nav" aria-label="Navegación principal">
<?php foreach (['inicio' => 'Inicio', 'biblioteca' => 'Biblioteca', 'muro' => 'Comunidad', 'mi-agenda' => 'Mi agenda'] as $slug => $label) { ?>
<a href="<?php echo esc_url(home_url($slug === 'inicio' ? '/' : '/' . $slug . '/')); ?>" <?php if (is_page($slug)) { echo 'aria-current="page"'; } ?>><?php echo esc_html($label); ?></a>
<?php } ?>
<?php if (is_user_logged_in()) { ?><a href="<?php echo esc_url(home_url('/perfil/')); ?>">Mi perfil</a><a class="account-link" href="<?php echo esc_url(wp_logout_url(home_url('/'))); ?>">Salir</a><?php } else { ?><a class="account-link" href="<?php echo esc_url(wp_login_url(home_url('/mi-agenda/'))); ?>">Ingresar</a><?php } ?>
</nav></header><main id="contenido" class="main-container">
