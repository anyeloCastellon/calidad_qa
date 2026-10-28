<?php get_header(); ?>
<div class="page-intro"><p class="eyebrow">Buscar en el portal</p><h1>Resultados de búsqueda</h1><p class="lede">Consulta: <?php echo esc_html(get_search_query(false)); ?></p></div>
<div class="search-results"><?php if (have_posts()) { while (have_posts()) { the_post(); ?><article class="surface"><h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2><p><?php echo esc_html(wp_trim_words(get_the_excerpt(), 20)); ?></p></article><?php } } else { ?><section class="surface"><h2>No se encontraron coincidencias</h2></section><?php } ?></div>
<?php get_footer(); ?>
