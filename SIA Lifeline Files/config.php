<?php
// config.php - Automatically switches between Railway environment variables and local XAMPP defaults

return [
    'db_host'    => getenv('MYSQLHOST') ?: '127.0.0.1',
    'db_name'    => getenv('MYSQLDATABASE') ?: 'lifeline',
    'db_user'    => getenv('MYSQLUSER') ?: 'lifeline_app',
    'db_pass'    => getenv('MYSQLPASSWORD') !== false ? getenv('MYSQLPASSWORD') : 'ChangeThisPassword!',
    'db_port'    => getenv('MYSQLPORT') ?: '3306',
    'db_charset' => 'utf8mb4',

    'timezone_offset' => '+08:00',           // Philippines (Asia/Manila)

    'alert_cooldown_sec'      => 180,        // block a duplicate alert for the same room
    'max_active_per_reporter' => 3,          // max unresolved alerts one student may have
    'max_login_attempts'      => 5,
    'lockout_sec'             => 60,
];
