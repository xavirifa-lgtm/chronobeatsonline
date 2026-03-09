<?php
// reporte_error.php
// Este script recibe una URL de YouTube reportada como rota y la guarda en revision.txt

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Permitir acceso desde la web si es necesario

// Leer datos de la petición (soporta JSON o POST normal)
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$url_rota = isset($data['url']) ? $data['url'] : (isset($_POST['url']) ? $_POST['url'] : null);
$tipo_lista = isset($data['tipo']) ? $data['tipo'] : (isset($_POST['tipo']) ? $_POST['tipo'] : 'Desconocido');

if ($url_rota) {
    // Sanitizar entrada
    $url_rota = filter_var($url_rota, FILTER_SANITIZE_URL);
    $tipo_lista = htmlspecialchars($tipo_lista);
    
    // Archivo donde se guardarán los reportes
    $archivo_reportes = 'revision.txt';
    
    // Formato del log: Fecha - Tipo de Lista - URL
    $fecha = date('Y-m-d H:i:s');
    $linea = "[$fecha] [$tipo_lista] ROTA: $url_rota" . PHP_EOL;
    
    // Escribir en el archivo
    if (file_put_contents($archivo_reportes, $linea, FILE_APPEND | LOCK_EX) !== false) {
        echo json_encode(['status' => 'success', 'message' => 'Reporte guardado correctamente.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error al guardar el reporte en el servidor.']);
    }
} else {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No se proporcionó ninguna URL.']);
}
?>
