<?php
add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('html5', ['search-form', 'comment-form', 'comment-list']);
});
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('campus-theme', get_stylesheet_uri(), [], '1.0.0');
});
add_filter('show_admin_bar', '__return_false');
