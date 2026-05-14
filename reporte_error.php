<?php
/**
 * reporte_error.php - Recibe reportes de canciones con enlace roto en CHRONOBEATS
 * Guarda los reportes en reporte_errores.log con fecha, URL y tipo de lista
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

$input = file_get_contents('php://input');
$data  = json_decode($input, true);

if (!$data || empty($data['url'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Datos inválidos']);
    exit;
}

$url   = filter_var(trim($data['url']), FILTER_SANITIZE_URL);
$tipo  = isset($data['tipo']) ? htmlspecialchars(trim($data['tipo']), ENT_QUOTES) : 'Desconocido';
$fecha = date('Y-m-d H:i:s');
$ip    = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';

// Validar que sea una URL de YouTube
if (!preg_match('/^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+$/', $url)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'URL no válida']);
    exit;
}

$logFile = __DIR__ . '/reporte_errores.log';
$linea   = "[$fecha] IP=$ip | TIPO=$tipo | URL=$url\n";

$escrito = file_put_contents($logFile, $linea, FILE_APPEND | LOCK_EX);

if ($escrito === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudo guardar el reporte']);
    exit;
}

echo json_encode(['ok' => true, 'mensaje' => 'Reporte guardado correctamente']);
