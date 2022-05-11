#!/usr/bin/php
<?php //BÖM
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);

/**
 * Munin like plugin
 * Optional: error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);
 */

if ($argv[1] == 'config') {
	echo "graph_args --base 1000 -l 0\n";
	echo "graph_title Testdaten\n";
	echo "graph_vlabel Testdaten pro Tag\n";
	echo "graph_category TEST\n";
	echo "graph_scale no\n";

	echo "stat1.draw AREA\n";
	echo "stat1.min 0\n";
	echo "stat1.label Statusdata 1\n";

	echo "test2.draw AREA\n";
	echo "test2.min 0\n";
	echo "test2.label Statusdata 2\n";
	exit;
}

echo "stat1.value ".rand(10000, 100000)."\n";
echo "test2.value ".rand(10000, 100000)."\n";
?>