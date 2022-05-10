#!/usr/bin/php
<?php // BÖM
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);
define("ROOTFS", dirname(__FILE__));

//echo "Root:".ROOTFS."\n";

// Paths
$pluginsDir = ROOTFS.DIRECTORY_SEPARATOR.'plugins';
$httpdocs = ROOTFS.DIRECTORY_SEPARATOR.'httpdocs';
$dbDir = $httpdocs.DIRECTORY_SEPARATOR.'db';
$logdir = ROOTFS.DIRECTORY_SEPARATOR.'logs';
$logfile = $logdir.DIRECTORY_SEPARATOR.'sysstat-web.log';
$user = 'www-data';
$group = 'www-data';
$plugin_ignore = ['dummy', 'plugin.sh'];
$env = array_merge($_ENV, [
	'MUNIN_LIBDIR' => ROOTFS.DIRECTORY_SEPARATOR.'munin',
]);

// Crate folders
if (!is_dir($logdir)) {
	if (!mkdir($logdir, 0777, true)) {
		echo "can't crate $logdir folder\n";
	}
	else {
		chown($logdir, $user);
		chgrp($logdir, $group);
	}
}
if (!is_dir($dbDir)) {
	if (!mkdir($dbDir, 0777, true)) {
		echo "can't crate $dbDir folder\n";
	}
	else {
		chown($dbDir, $user);
		chgrp($dbDir, $group);
	}
}

// Log rotation
if (filesize($logfile) >= 100 * 1000000) rename($logfile, $logfile.date('Y-m-d_His'));

if (!is_dir($dbDir)) ini_set("error_log", $logfile);

function onError($errno = 0, $errstr = '', $errfile = null, $errline = null, $errcontext = null) {
	if ($errstr || $errfile) error_log($errstr.' in '.$errfile.':'.$errline);
}
function onException($exception) {
	onError($exception->getCode(), $exception->getMessage(), $exception->getFile(), $exception->getLine(), $exception);
}
set_exception_handler('onException');
set_error_handler('onError', E_ALL & ~E_NOTICE);

$mode = isset($argv) && in_array('init', $argv) ? 'init' : (isset($_REQUEST['mode']) ? $_REQUEST['mode'] : '');
$debug = isset($argv) && in_array('debug', $argv) || isset($_REQUEST['debug']);
if (!defined('STDIN')) header("Content-Type: text/plain; charset=UTF-8");

$date  = date('Y-m-d');
$time  = date('H:i:s');

if ($mode == 'init') {
	$DBConfigFile = $dbDir.DIRECTORY_SEPARATOR.'config.json';
	$DBConfig = [];
	/*if (file_exists($DBConfigFile)) {
		try {
			$DBConfigData = file_get_contents($DBConfigFile);
			$DBConfig = json_decode($DBConfigData, true);
		} catch (Exception $d) {}
	}*/

	if ($handle = @opendir($pluginsDir)) {
		while (false !== ($entry = readdir($handle))) {
			if (in_array($entry, $plugin_ignore) || $entry == '..' || $entry == '.') continue;

			$plugin = $pluginsDir . DIRECTORY_SEPARATOR . $entry;
			//if (is_link($plugin)) $plugin = readlink($plugin);

			if (is_file($plugin)) {
				$isPHP = strtoupper(substr($entry, -4)) === '.PHP';
				if ($isPHP || is_executable($plugin)) {
					$cmd = '';
					if ($isPHP) $cmd .= 'php ';
					$cmd .= '"'.$plugin.'" config';

					if ($debug) echo 'Command: '.$cmd."\n";

					$res = array(
						0 => array("pipe", "r"),
						1 => array("pipe", "w"),
						2 => array("pipe", "w")
					);

					//echo "run $cmd\n";
					$process = proc_open(
						$cmd,
						$res,
						$pipes,
						null,
						$env
					);
					if (is_resource($process)) {
						$std_output = stream_get_contents($pipes[1]);
						$err_output = stream_get_contents($pipes[2]);

						if ($debug) {
							if ($std_output)  echo 'STDOUT: '.$std_output."\n";
							if ($err_output) echo 'STDERR: '.$err_output."\n";
						}

						$stat = proc_get_status($process);
						fclose($pipes[1]);
						fclose($pipes[2]);
						$proc_value = proc_close( $process);

						if ($err_output) {
							error_log("Process $plugin exit with code ".$stat['exitcode'].":\n".$err_output);
						}

						if ($std_output) {
							// Munin config
							if (strpos($std_output, 'graph_') !== false) {
								$lines = explode("\n", $std_output);
								//print_r($lines);
								$DBConfigItem = [
									'type' => 'line',
									'options' => [
										"animation" => false
									],
									'data' => [],
								];
								$datasets = [];
								foreach ($lines as $i=>$line) {
									$split = strpos($line, ' ');
									$name = substr($line, 0, $split);
									$value = trim(substr($line, $split+1));
									if (strpos($name, 'graph_') !== false) {
										$name = substr($name, 6);
										switch ($name) {
											// TODO Prüfen was verwendet werden kann
											case 'args':
											case 'scale':
												$name = null;
												break;
											case 'vlabel':
												$name = null;
												if (!$DBConfigItem['options']) $DBConfigItem['options'] = [];
												if (!$DBConfigItem['options']['scales']) $DBConfigItem['options']['scales'] = [];
												if (!$DBConfigItem['options']['scales']['y']) $DBConfigItem['options']['scales']['y'] = [];
												$DBConfigItem['options']['scales']['y']['title'] = [
													'display' => true,
													'text' => $value
												];
												break;
											/*case 'title':
												$name = null;
												if (!$DBConfigItem['options']['plugins']) $DBConfigItem['options']['plugins'] = [];
												$DBConfigItem['options']['plugins']['title'] = [
													'display' => true,
													'text' => $value
												];
												break;*/
										}

										if ($name) {
											$DBConfigItem[$name] = $value;
										}
									}
									else if (($dot = strpos($name, '.')) !== false) {
										$gname = substr($name, 0, $dot);
										$gprop = substr($name, $dot+1);

										switch ($gprop) {
											case 'draw':
												if (strtoupper($value) == 'AREA') {
													$gprop = 'fill';
													$value = true;
												}
												break;
											case 'type':
												$gprop = null;
												break;
										}

										if ($gprop) {
											if (!isset($datasets[$gname])) $datasets[$gname] = [
												'id' => $gname
											];
											$datasets[$gname][$gprop] = $value;
										}
									}
								}
								$DBConfigItem['data']['datasets'] = array_values($datasets);
								$DBConfig[$entry] = $DBConfigItem;
							}
							else {
								$DBConfig[$entry] = json_decode($std_output);
							}
						}
					}
					else {
						error_log("ERROR: Plugin $plugin not executable!");
						if ($debug) echo "ERROR: Plugin $plugin not executable!\n";
					}
				}
			}
		}

		closedir($handle);

		file_put_contents($DBConfigFile, json_encode($DBConfig, JSON_PRETTY_PRINT));
		chown($DBConfigFile, $user);
		chgrp($DBConfigFile, $group);

		echo "$DBConfigFile writen\n";
	}
	else {
		error_log("ERROR: Can't open dir $pluginsDir");
		if ($debug) echo "ERROR: Can't open dir $pluginsDir \n";
	}
}
// Statistiken schreiben
else {
	if ($handle = @opendir($pluginsDir)) {
		while (false !== ($entry = readdir($handle))) {
			if (in_array($entry, $plugin_ignore) || $entry == '..' || $entry == '.') continue;

			$plugin = $pluginsDir . DIRECTORY_SEPARATOR . $entry;
			$dbPath = $dbDir.DIRECTORY_SEPARATOR.$entry.'.'.$date.'.db';
			//if (is_link($plugin)) $plugin = readlink($plugin);

			if (is_file($plugin)) {
				$isPHP = strtoupper(substr($entry, -4)) === '.PHP';
				if ($isPHP || is_executable($plugin)) {
					$cmd = '';
					if ($isPHP) $cmd .= 'php ';
					$cmd .= '"'.$plugin.'"';
					$res = array(
						0 => array("pipe", "r"),
						1 => array("pipe", "w"),
						2 => array("pipe", "w")
					);

					if ($debug) echo "COMMAND: $cmd \n";
					$process = proc_open(
						$cmd,
						$res,
						$pipes,
						null,
						$env
					);
					if (is_resource($process)) {
						$std_output = stream_get_contents($pipes[1]);
						$err_output = stream_get_contents($pipes[2]);
						fclose($pipes[1]);
						fclose($pipes[2]);
						$proc_value = proc_close($process);

						if ($debug) {
							if ($std_output)  echo 'STDOUT: '.$std_output."\n";
							if ($err_output) echo 'STDERR: '.$err_output."\n";
						}

						if ($err_output) error_log($err_output);

						if ($std_output) {
							$lines = explode("\n", $std_output);
							foreach ($lines as $line) {
								$line = trim($line);
								if ($line === '') continue;
								if (strpos($line, '.value') !== false) {
									file_put_contents($dbPath, $time." ".trim($line)."\n", FILE_APPEND);
								}
								else if (preg_match('/^[a-zA-Z0-9_-]+ [0-9]+/', $line) !== false) {
									file_put_contents($dbPath, $time." ".trim($line)."\n", FILE_APPEND);
								}
							}
							chown($dbPath, $user);
							chgrp($dbPath, $group);
						}
					}
				}
				else {
					error_log("ERROR: Plugin $plugin not executable!");
					if ($debug) echo "ERROR: Plugin $plugin not executable!\n";
				}
			}
		}

		closedir($handle);
	}
	else {
		error_log("ERROR: Can't open dir $pluginsDir");
		echo "ERROR: Can't open dir $pluginsDir\n";
	}
}