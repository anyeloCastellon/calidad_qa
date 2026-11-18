<?php
/**
 * Plugin Name: Campus Blog
 * Description: Entrada de blog con comentarios abiertos para las prácticas de automatización de pruebas.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) { exit; }

function campus_blog_seed($reset = false) {
    $existing = get_page_by_path('bitacora-comunidad', OBJECT, 'post');
    $data = [
        'post_type'      => 'post',
        'post_name'      => 'bitacora-comunidad',
        'post_title'     => 'Bitácora de la comunidad',
        'post_content'   => 'Un espacio para compartir aprendizajes, dudas y logros de la comunidad. Deja tu comentario más abajo.',
        'post_status'    => 'publish',
        'comment_status' => 'open',
    ];
    if ($existing) { $data['ID'] = $existing->ID; }
    $post_id = wp_insert_post($data);
    if ($reset && $post_id && !is_wp_error($post_id)) {
        foreach (get_comments(['post_id' => $post_id]) as $comment) {
            wp_delete_comment($comment->comment_ID, true);
        }
    }
    update_option('campus_blog_version', '1.0.0');
    flush_rewrite_rules();
}
