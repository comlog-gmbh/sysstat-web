#!/usr/bin/php
<?php //BÖM
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);

if ($argv[1] == 'config') {
	$config = [
		"type" => "line",
		"title" => "Testdaten 2",
		"category" => "TEST",
		"options" => [
			"animation" => false
        ],
        "data" => [
		"datasets" => [
                [
					"id" => "stat1",
                    "fill" => true,
                    "min" => "0",
                    "label" => "Statusdata 1"
                ],
                [
					"id" => "test2",
                    "fill" => true,
                    "min" => "0",
                    "label" => "Statusdata 2"
                ]
            ]
        ]
 	];

	echo json_encode($config, JSON_PRETTY_PRINT);
	exit;
}

echo "stat1 ".rand(0, 100)."\n";
echo "test2 ".rand(0, 100)."\n";
?>