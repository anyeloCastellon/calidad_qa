<?php get_header(); ?>
<?php if (have_posts()) { while (have_posts()) { the_post(); ?>
<?php if (is_page()) { the_content(); } else { ?>
<article class="article"><p class="eyebrow">Historias de nuestra comunidad</p><h1><?php the_title(); ?></h1><p>Por <?php the_author(); ?></p><div class="article-body"><?php the_content(); ?></div><a class="back-link" href="<?php echo esc_url(home_url('/')); ?>">← Volver al inicio</a></article>
<?php } ?>
<?php } } else { ?><section class="page-intro"><h1>Página no disponible</h1><p>Vuelve al inicio para continuar.</p><a href="<?php echo esc_url(home_url('/')); ?>">Ir al inicio</a></section><?php } ?>
<?php get_footer(); ?>
