<?php
/**
 * Yoghurt Factory Inventory Management API
 * Backend for hariindustries.net
 * 
 * Deploy this file to: https://hariindustries.net/api/inventory.php
 */

// Enable error reporting for development (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Set to 0 in production

// CORS headers to allow requests from your frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration - UPDATE THESE WITH YOUR CREDENTIALS
define('DB_HOST', 'localhost');
define('DB_NAME', 'hariindu_inventory');
define('DB_USER', 'hariindu_inventory');
define('DB_PASS', 'inventory12!');

// Connect to database
function getDbConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        sendError('Database connection failed: ' . $e->getMessage());
        exit();
    }
}

// Helper functions
function sendSuccess($data = null, $message = 'Success') {
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data
    ]);
    exit();
}

function sendError($message = 'An error occurred', $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
    exit();
}

function generateId($prefix) {
    return $prefix . '-' . time() . '-' . bin2hex(random_bytes(4));
}

// Initialize database tables
function initializeDatabase($pdo) {
    try {
        // Create inventory table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS inventory (
                id VARCHAR(50) PRIMARY KEY,
                product_name VARCHAR(255) NOT NULL,
                sku VARCHAR(100) NOT NULL UNIQUE,
                quantity INT NOT NULL DEFAULT 0,
                unit VARCHAR(50) NOT NULL,
                location VARCHAR(255) NOT NULL,
                status ENUM('in-stock', 'low-stock', 'out-of-stock', 'excess-stock') NOT NULL,
                last_updated DATETIME NOT NULL,
                reorder_level INT NOT NULL,
                max_level INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_sku (sku),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create transactions table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(50) PRIMARY KEY,
                type ENUM('submission', 'acceptance', 'rejection', 'invoice', 'adjustment') NOT NULL,
                timestamp DATETIME NOT NULL,
                from_department VARCHAR(100),
                to_department VARCHAR(100),
                product_id VARCHAR(50),
                product_name VARCHAR(255),
                sku VARCHAR(100),
                quantity INT NOT NULL,
                user VARCHAR(255) NOT NULL,
                user_role VARCHAR(100) NOT NULL,
                notes TEXT,
                invoice_number VARCHAR(100),
                customer_name VARCHAR(255),
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_type (type),
                INDEX idx_timestamp (timestamp),
                INDEX idx_user (user)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create pending_submissions table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS pending_submissions (
                id VARCHAR(50) PRIMARY KEY,
                product_name VARCHAR(255) NOT NULL,
                sku VARCHAR(100) NOT NULL,
                quantity INT NOT NULL,
                unit VARCHAR(50) NOT NULL,
                submitted_by VARCHAR(255) NOT NULL,
                submitted_at DATETIME NOT NULL,
                status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
                notes TEXT,
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_submitted_at (submitted_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Create invoices table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS invoices (
                id VARCHAR(50) PRIMARY KEY,
                invoice_number VARCHAR(100) NOT NULL UNIQUE,
                customer_name VARCHAR(255) NOT NULL,
                items JSON NOT NULL,
                total_items INT NOT NULL,
                generated_by VARCHAR(255) NOT NULL,
                generated_at DATETIME NOT NULL,
                status ENUM('active', 'fulfilled') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_invoice_number (invoice_number),
                INDEX idx_generated_at (generated_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Insert default inventory data if table is empty
        $count = $pdo->query("SELECT COUNT(*) FROM inventory")->fetchColumn();
        if ($count == 0) {
            $defaultProducts = [
                // Regular Yoghurt - 500ml
                ['FIN001', 'Strawberry Yoghurt 500ml', 'YGT-STR-500', 4800, 'units', 'Cold Room 1', 'in-stock', 2000, 8000],
                ['FIN002', 'Vanilla Yoghurt 500ml', 'YGT-VAN-500', 5200, 'units', 'Cold Room 1', 'in-stock', 2000, 8000],
                ['FIN003', 'Blueberry Yoghurt 500ml', 'YGT-BLU-500', 1800, 'units', 'Cold Room 2', 'low-stock', 2000, 8000],
                ['FIN004', 'Mango Yoghurt 500ml', 'YGT-MNG-500', 3600, 'units', 'Cold Room 2', 'in-stock', 2000, 8000],
                ['FIN005', 'Peach Yoghurt 500ml', 'YGT-PCH-500', 950, 'units', 'Cold Room 2', 'low-stock', 2000, 8000],
                ['FIN006', 'Mixed Berry Yoghurt 500ml', 'YGT-MBR-500', 4200, 'units', 'Cold Room 1', 'in-stock', 2000, 8000],
                ['FIN007', 'Raspberry Yoghurt 500ml', 'YGT-RAS-500', 0, 'units', 'Cold Room 2', 'out-of-stock', 2000, 8000],
                ['FIN008', 'Banana Yoghurt 500ml', 'YGT-BAN-500', 3100, 'units', 'Cold Room 1', 'in-stock', 2000, 8000],
                ['FIN009', 'Cherry Yoghurt 500ml', 'YGT-CHR-500', 2800, 'units', 'Cold Room 2', 'in-stock', 2000, 8000],
                ['FIN010', 'Passion Fruit Yoghurt 500ml', 'YGT-PAS-500', 1500, 'units', 'Cold Room 3', 'low-stock', 2000, 8000],
                
                // Greek Yoghurt - Various Sizes
                ['FIN011', 'Greek Plain Yoghurt 250ml', 'YGT-GRK-PLN-250', 6500, 'units', 'Cold Room 1', 'in-stock', 3000, 10000],
                ['FIN012', 'Greek Strawberry Yoghurt 250ml', 'YGT-GRK-STR-250', 5800, 'units', 'Cold Room 1', 'in-stock', 3000, 10000],
                ['FIN013', 'Greek Honey Yoghurt 250ml', 'YGT-GRK-HON-250', 4200, 'units', 'Cold Room 2', 'in-stock', 3000, 10000],
                ['FIN014', 'Greek Blueberry Yoghurt 500ml', 'YGT-GRK-BLU-500', 2900, 'units', 'Cold Room 2', 'in-stock', 2000, 8000],
                ['FIN015', 'Greek Vanilla Yoghurt 500ml', 'YGT-GRK-VAN-500', 3400, 'units', 'Cold Room 1', 'in-stock', 2000, 8000],
                
                // Plain Yoghurt - Various Sizes
                ['FIN016', 'Plain Yoghurt 1L', 'YGT-PLN-1000', 3600, 'units', 'Cold Room 2', 'in-stock', 1500, 6000],
                ['FIN017', 'Plain Yoghurt 2L', 'YGT-PLN-2000', 1200, 'units', 'Cold Room 3', 'in-stock', 800, 4000],
                ['FIN018', 'Plain Yoghurt 500ml', 'YGT-PLN-500', 5100, 'units', 'Cold Room 1', 'in-stock', 2000, 8000],
                ['FIN019', 'Plain Yoghurt 250ml', 'YGT-PLN-250', 7200, 'units', 'Cold Room 1', 'in-stock', 3000, 10000],
                
                // Low-Fat Yoghurt
                ['FIN020', 'Low-Fat Strawberry Yoghurt 500ml', 'YGT-LF-STR-500', 3800, 'units', 'Cold Room 2', 'in-stock', 2000, 8000],
                ['FIN021', 'Low-Fat Vanilla Yoghurt 500ml', 'YGT-LF-VAN-500', 4100, 'units', 'Cold Room 2', 'in-stock', 2000, 8000],
                ['FIN022', 'Low-Fat Peach Yoghurt 500ml', 'YGT-LF-PCH-500', 1600, 'units', 'Cold Room 3', 'low-stock', 2000, 8000],
                ['FIN023', 'Low-Fat Mango Yoghurt 500ml', 'YGT-LF-MNG-500', 2700, 'units', 'Cold Room 2', 'in-stock', 2000, 8000],
                ['FIN024', 'Low-Fat Mixed Berry 500ml', 'YGT-LF-MBR-500', 3200, 'units', 'Cold Room 1', 'in-stock', 2000, 8000],
                
                // Fat-Free Yoghurt
                ['FIN025', 'Fat-Free Plain Yoghurt 500ml', 'YGT-FF-PLN-500', 2900, 'units', 'Cold Room 3', 'in-stock', 2000, 8000],
                ['FIN026', 'Fat-Free Strawberry Yoghurt 500ml', 'YGT-FF-STR-500', 2400, 'units', 'Cold Room 3', 'in-stock', 2000, 8000],
                ['FIN027', 'Fat-Free Blueberry Yoghurt 500ml', 'YGT-FF-BLU-500', 1900, 'units', 'Cold Room 3', 'low-stock', 2000, 8000],
                ['FIN028', 'Fat-Free Vanilla Yoghurt 500ml', 'YGT-FF-VAN-500', 3100, 'units', 'Cold Room 2', 'in-stock', 2000, 8000],
                
                // Probiotic Yoghurt
                ['FIN029', 'Probiotic Plain Yoghurt 250ml', 'YGT-PRO-PLN-250', 4500, 'units', 'Cold Room 1', 'in-stock', 3000, 10000],
                ['FIN030', 'Probiotic Strawberry Yoghurt 250ml', 'YGT-PRO-STR-250', 4200, 'units', 'Cold Room 1', 'in-stock', 3000, 10000],
                ['FIN031', 'Probiotic Mango Yoghurt 250ml', 'YGT-PRO-MNG-250', 3800, 'units', 'Cold Room 2', 'in-stock', 3000, 10000],
                ['FIN032', 'Probiotic Mixed Berry 250ml', 'YGT-PRO-MBR-250', 2800, 'units', 'Cold Room 2', 'low-stock', 3000, 10000],
                
                // Organic Yoghurt
                ['FIN033', 'Organic Plain Yoghurt 500ml', 'YGT-ORG-PLN-500', 2200, 'units', 'Cold Room 3', 'in-stock', 1500, 6000],
                ['FIN034', 'Organic Strawberry Yoghurt 500ml', 'YGT-ORG-STR-500', 1900, 'units', 'Cold Room 3', 'in-stock', 1500, 6000],
                ['FIN035', 'Organic Blueberry Yoghurt 500ml', 'YGT-ORG-BLU-500', 1400, 'units', 'Cold Room 3', 'low-stock', 1500, 6000],
                ['FIN036', 'Organic Vanilla Yoghurt 500ml', 'YGT-ORG-VAN-500', 2100, 'units', 'Cold Room 3', 'in-stock', 1500, 6000],
                
                // Kids Yoghurt Pouches - 150ml
                ['FIN037', 'Kids Strawberry Yoghurt Pouch 150ml', 'YGT-KID-STR-150', 8500, 'units', 'Cold Room 1', 'in-stock', 5000, 15000],
                ['FIN038', 'Kids Banana Yoghurt Pouch 150ml', 'YGT-KID-BAN-150', 7800, 'units', 'Cold Room 1', 'in-stock', 5000, 15000],
                ['FIN039', 'Kids Mixed Fruit Yoghurt Pouch 150ml', 'YGT-KID-MIX-150', 9200, 'units', 'Cold Room 1', 'in-stock', 5000, 15000],
                ['FIN040', 'Kids Vanilla Yoghurt Pouch 150ml', 'YGT-KID-VAN-150', 8100, 'units', 'Cold Room 1', 'in-stock', 5000, 15000],
                
                // Drinking Yoghurt - 200ml Bottles
                ['FIN041', 'Strawberry Drinking Yoghurt 200ml', 'YGT-DRK-STR-200', 6200, 'units', 'Cold Room 2', 'in-stock', 4000, 12000],
                ['FIN042', 'Mango Drinking Yoghurt 200ml', 'YGT-DRK-MNG-200', 5900, 'units', 'Cold Room 2', 'in-stock', 4000, 12000],
                ['FIN043', 'Mixed Berry Drinking Yoghurt 200ml', 'YGT-DRK-MBR-200', 6500, 'units', 'Cold Room 2', 'in-stock', 4000, 12000],
                ['FIN044', 'Peach Drinking Yoghurt 200ml', 'YGT-DRK-PCH-200', 3800, 'units', 'Cold Room 2', 'low-stock', 4000, 12000],
                
                // Family Pack Yoghurt - 1L
                ['FIN045', 'Family Pack Strawberry Yoghurt 1L', 'YGT-FAM-STR-1000', 2400, 'units', 'Cold Room 3', 'in-stock', 1500, 6000],
                ['FIN046', 'Family Pack Vanilla Yoghurt 1L', 'YGT-FAM-VAN-1000', 2600, 'units', 'Cold Room 3', 'in-stock', 1500, 6000],
                ['FIN047', 'Family Pack Mixed Berry 1L', 'YGT-FAM-MBR-1000', 2100, 'units', 'Cold Room 3', 'in-stock', 1500, 6000],
                
                // Premium Yoghurt
                ['FIN048', 'Premium Coconut Yoghurt 250ml', 'YGT-PRM-COC-250', 3200, 'units', 'Cold Room 2', 'in-stock', 2000, 7000],
                ['FIN049', 'Premium Lychee Yoghurt 250ml', 'YGT-PRM-LYC-250', 2800, 'units', 'Cold Room 2', 'in-stock', 2000, 7000],
                ['FIN050', 'Premium Matcha Yoghurt 250ml', 'YGT-PRM-MAT-250', 1600, 'units', 'Cold Room 2', 'low-stock', 2000, 7000],
            ];

            $stmt = $pdo->prepare("
                INSERT INTO inventory (id, product_name, sku, quantity, unit, location, status, last_updated, reorder_level, max_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
            ");

            foreach ($defaultProducts as $product) {
                $stmt->execute($product);
            }
        }

        sendSuccess(null, 'Database initialized successfully');
    } catch (PDOException $e) {
        sendError('Database initialization failed: ' . $e->getMessage(), 500);
    }
}

// API Endpoints
$pdo = getDbConnection();
$endpoint = $_GET['endpoint'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($endpoint) {
    // Initialize endpoint
    case 'initialize':
        if ($method === 'POST') {
            initializeDatabase($pdo);
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Get inventory
    case 'getInventory':
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT * FROM inventory ORDER BY product_name");
                $inventory = $stmt->fetchAll();
                
                // Convert to frontend format
                $formattedInventory = array_map(function($item) {
                    return [
                        'id' => $item['id'],
                        'productName' => $item['product_name'],
                        'sku' => $item['sku'],
                        'quantity' => (int)$item['quantity'],
                        'unit' => $item['unit'],
                        'location' => $item['location'],
                        'status' => $item['status'],
                        'lastUpdated' => date('Y-m-d', strtotime($item['last_updated'])),
                        'reorderLevel' => (int)$item['reorder_level'],
                        'maxLevel' => (int)$item['max_level']
                    ];
                }, $inventory);
                
                sendSuccess($formattedInventory);
            } catch (PDOException $e) {
                sendError('Failed to fetch inventory: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Update inventory
    case 'updateInventory':
        if ($method === 'POST') {
            try {
                $input = json_decode(file_get_contents('php://input'), true);
                $inventory = $input['inventory'] ?? [];

                if (empty($inventory)) {
                    sendError('Invalid inventory data');
                }

                $pdo->beginTransaction();

                $stmt = $pdo->prepare("
                    INSERT INTO inventory (id, product_name, sku, quantity, unit, location, status, last_updated, reorder_level, max_level)
                    VALUES (:id, :product_name, :sku, :quantity, :unit, :location, :status, NOW(), :reorder_level, :max_level)
                    ON DUPLICATE KEY UPDATE
                        product_name = VALUES(product_name),
                        quantity = VALUES(quantity),
                        unit = VALUES(unit),
                        location = VALUES(location),
                        status = VALUES(status),
                        last_updated = NOW(),
                        reorder_level = VALUES(reorder_level),
                        max_level = VALUES(max_level)
                ");

                foreach ($inventory as $item) {
                    $stmt->execute([
                        ':id' => $item['id'],
                        ':product_name' => $item['productName'],
                        ':sku' => $item['sku'],
                        ':quantity' => $item['quantity'],
                        ':unit' => $item['unit'],
                        ':location' => $item['location'],
                        ':status' => $item['status'],
                        ':reorder_level' => $item['reorderLevel'],
                        ':max_level' => $item['maxLevel']
                    ]);
                }

                $pdo->commit();
                sendSuccess(null, 'Inventory updated successfully');
            } catch (PDOException $e) {
                $pdo->rollBack();
                sendError('Failed to update inventory: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Update single inventory item
    case 'updateInventoryItem':
        if ($method === 'POST') {
            try {
                $input = json_decode(file_get_contents('php://input'), true);
                $item = $input['item'] ?? null;

                if (!$item) {
                    sendError('Invalid item data');
                }

                $stmt = $pdo->prepare("
                    UPDATE inventory SET
                        product_name = :product_name,
                        quantity = :quantity,
                        unit = :unit,
                        location = :location,
                        status = :status,
                        last_updated = NOW(),
                        reorder_level = :reorder_level,
                        max_level = :max_level
                    WHERE id = :id
                ");

                $stmt->execute([
                    ':id' => $item['id'],
                    ':product_name' => $item['productName'],
                    ':quantity' => $item['quantity'],
                    ':unit' => $item['unit'],
                    ':location' => $item['location'],
                    ':status' => $item['status'],
                    ':reorder_level' => $item['reorderLevel'],
                    ':max_level' => $item['maxLevel']
                ]);

                sendSuccess(null, 'Item updated successfully');
            } catch (PDOException $e) {
                sendError('Failed to update item: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Get transactions
    case 'getTransactions':
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT * FROM transactions ORDER BY timestamp DESC");
                $transactions = $stmt->fetchAll();
                
                $formattedTransactions = array_map(function($txn) {
                    return [
                        'id' => $txn['id'],
                        'type' => $txn['type'],
                        'timestamp' => date('c', strtotime($txn['timestamp'])),
                        'fromDepartment' => $txn['from_department'],
                        'toDepartment' => $txn['to_department'],
                        'productId' => $txn['product_id'],
                        'productName' => $txn['product_name'],
                        'sku' => $txn['sku'],
                        'quantity' => (int)$txn['quantity'],
                        'user' => $txn['user'],
                        'userRole' => $txn['user_role'],
                        'notes' => $txn['notes'],
                        'invoiceNumber' => $txn['invoice_number'],
                        'customerName' => $txn['customer_name'],
                        'status' => $txn['status']
                    ];
                }, $transactions);
                
                sendSuccess($formattedTransactions);
            } catch (PDOException $e) {
                sendError('Failed to fetch transactions: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Add transaction
    case 'addTransaction':
        if ($method === 'POST') {
            try {
                $input = json_decode(file_get_contents('php://input'), true);
                $txn = $input['transaction'] ?? null;

                if (!$txn) {
                    sendError('Invalid transaction data');
                }

                $id = generateId('TXN');
                $timestamp = date('Y-m-d H:i:s');

                $stmt = $pdo->prepare("
                    INSERT INTO transactions (
                        id, type, timestamp, from_department, to_department, product_id, product_name,
                        sku, quantity, user, user_role, notes, invoice_number, customer_name, status
                    ) VALUES (
                        :id, :type, :timestamp, :from_department, :to_department, :product_id, :product_name,
                        :sku, :quantity, :user, :user_role, :notes, :invoice_number, :customer_name, :status
                    )
                ");

                $stmt->execute([
                    ':id' => $id,
                    ':type' => $txn['type'],
                    ':timestamp' => $timestamp,
                    ':from_department' => $txn['fromDepartment'] ?? null,
                    ':to_department' => $txn['toDepartment'] ?? null,
                    ':product_id' => $txn['productId'] ?? null,
                    ':product_name' => $txn['productName'] ?? null,
                    ':sku' => $txn['sku'] ?? null,
                    ':quantity' => $txn['quantity'],
                    ':user' => $txn['user'],
                    ':user_role' => $txn['userRole'],
                    ':notes' => $txn['notes'] ?? null,
                    ':invoice_number' => $txn['invoiceNumber'] ?? null,
                    ':customer_name' => $txn['customerName'] ?? null,
                    ':status' => $txn['status'] ?? null
                ]);

                $newTransaction = [
                    'id' => $id,
                    'type' => $txn['type'],
                    'timestamp' => date('c', strtotime($timestamp)),
                    'fromDepartment' => $txn['fromDepartment'] ?? null,
                    'toDepartment' => $txn['toDepartment'] ?? null,
                    'productId' => $txn['productId'] ?? null,
                    'productName' => $txn['productName'] ?? null,
                    'sku' => $txn['sku'] ?? null,
                    'quantity' => (int)$txn['quantity'],
                    'user' => $txn['user'],
                    'userRole' => $txn['userRole'],
                    'notes' => $txn['notes'] ?? null,
                    'invoiceNumber' => $txn['invoiceNumber'] ?? null,
                    'customerName' => $txn['customerName'] ?? null,
                    'status' => $txn['status'] ?? null
                ];

                sendSuccess($newTransaction, 'Transaction added successfully');
            } catch (PDOException $e) {
                sendError('Failed to add transaction: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Get pending submissions
    case 'getPendingSubmissions':
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT * FROM pending_submissions ORDER BY submitted_at DESC");
                $submissions = $stmt->fetchAll();
                
                $formattedSubmissions = array_map(function($sub) {
                    return [
                        'id' => $sub['id'],
                        'productName' => $sub['product_name'],
                        'sku' => $sub['sku'],
                        'quantity' => (int)$sub['quantity'],
                        'unit' => $sub['unit'],
                        'submittedBy' => $sub['submitted_by'],
                        'submittedAt' => date('c', strtotime($sub['submitted_at'])),
                        'status' => $sub['status'],
                        'notes' => $sub['notes'],
                        'location' => $sub['location']
                    ];
                }, $submissions);
                
                sendSuccess($formattedSubmissions);
            } catch (PDOException $e) {
                sendError('Failed to fetch pending submissions: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Add pending submission
    case 'addPendingSubmission':
        if ($method === 'POST') {
            try {
                $input = json_decode(file_get_contents('php://input'), true);
                $sub = $input['submission'] ?? null;

                if (!$sub) {
                    sendError('Invalid submission data');
                }

                $id = generateId('PEND');
                $submittedAt = date('Y-m-d H:i:s');

                $stmt = $pdo->prepare("
                    INSERT INTO pending_submissions (
                        id, product_name, sku, quantity, unit, submitted_by, submitted_at, status, notes, location
                    ) VALUES (
                        :id, :product_name, :sku, :quantity, :unit, :submitted_by, :submitted_at, 'pending', :notes, :location
                    )
                ");

                $stmt->execute([
                    ':id' => $id,
                    ':product_name' => $sub['productName'],
                    ':sku' => $sub['sku'],
                    ':quantity' => $sub['quantity'],
                    ':unit' => $sub['unit'],
                    ':submitted_by' => $sub['submittedBy'],
                    ':submitted_at' => $submittedAt,
                    ':notes' => $sub['notes'] ?? null,
                    ':location' => $sub['location'] ?? null
                ]);

                $newSubmission = [
                    'id' => $id,
                    'productName' => $sub['productName'],
                    'sku' => $sub['sku'],
                    'quantity' => (int)$sub['quantity'],
                    'unit' => $sub['unit'],
                    'submittedBy' => $sub['submittedBy'],
                    'submittedAt' => date('c', strtotime($submittedAt)),
                    'status' => 'pending',
                    'notes' => $sub['notes'] ?? null,
                    'location' => $sub['location'] ?? null
                ];

                sendSuccess($newSubmission, 'Submission added successfully');
            } catch (PDOException $e) {
                sendError('Failed to add submission: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Update pending submission
    case 'updatePendingSubmission':
        if ($method === 'POST') {
            try {
                $input = json_decode(file_get_contents('php://input'), true);
                $id = $input['id'] ?? null;
                $updates = $input['updates'] ?? null;

                if (!$id || !$updates) {
                    sendError('Invalid update data');
                }

                // Build dynamic update query
                $setParts = [];
                $params = [':id' => $id];

                if (isset($updates['status'])) {
                    $setParts[] = 'status = :status';
                    $params[':status'] = $updates['status'];
                }
                if (isset($updates['notes'])) {
                    $setParts[] = 'notes = :notes';
                    $params[':notes'] = $updates['notes'];
                }

                if (empty($setParts)) {
                    sendError('No valid fields to update');
                }

                $sql = "UPDATE pending_submissions SET " . implode(', ', $setParts) . " WHERE id = :id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                // Fetch updated record
                $stmt = $pdo->prepare("SELECT * FROM pending_submissions WHERE id = ?");
                $stmt->execute([$id]);
                $sub = $stmt->fetch();

                if ($sub) {
                    $updated = [
                        'id' => $sub['id'],
                        'productName' => $sub['product_name'],
                        'sku' => $sub['sku'],
                        'quantity' => (int)$sub['quantity'],
                        'unit' => $sub['unit'],
                        'submittedBy' => $sub['submitted_by'],
                        'submittedAt' => date('c', strtotime($sub['submitted_at'])),
                        'status' => $sub['status'],
                        'notes' => $sub['notes'],
                        'location' => $sub['location']
                    ];
                    sendSuccess($updated, 'Submission updated successfully');
                } else {
                    sendSuccess(null, 'Submission not found');
                }
            } catch (PDOException $e) {
                sendError('Failed to update submission: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Get invoices
    case 'getInvoices':
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT * FROM invoices ORDER BY generated_at DESC");
                $invoices = $stmt->fetchAll();
                
                $formattedInvoices = array_map(function($inv) {
                    return [
                        'id' => $inv['id'],
                        'invoiceNumber' => $inv['invoice_number'],
                        'customerName' => $inv['customer_name'],
                        'items' => json_decode($inv['items'], true),
                        'totalItems' => (int)$inv['total_items'],
                        'generatedBy' => $inv['generated_by'],
                        'generatedAt' => date('c', strtotime($inv['generated_at'])),
                        'status' => $inv['status']
                    ];
                }, $invoices);
                
                sendSuccess($formattedInvoices);
            } catch (PDOException $e) {
                sendError('Failed to fetch invoices: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    // Add invoice
    case 'addInvoice':
        if ($method === 'POST') {
            try {
                $input = json_decode(file_get_contents('php://input'), true);
                $inv = $input['invoice'] ?? null;

                if (!$inv) {
                    sendError('Invalid invoice data');
                }

                $id = generateId('INV');
                $generatedAt = date('Y-m-d H:i:s');

                $stmt = $pdo->prepare("
                    INSERT INTO invoices (
                        id, invoice_number, customer_name, items, total_items, generated_by, generated_at, status
                    ) VALUES (
                        :id, :invoice_number, :customer_name, :items, :total_items, :generated_by, :generated_at, :status
                    )
                ");

                $stmt->execute([
                    ':id' => $id,
                    ':invoice_number' => $inv['invoiceNumber'],
                    ':customer_name' => $inv['customerName'],
                    ':items' => json_encode($inv['items']),
                    ':total_items' => $inv['totalItems'],
                    ':generated_by' => $inv['generatedBy'],
                    ':generated_at' => $generatedAt,
                    ':status' => $inv['status']
                ]);

                $newInvoice = [
                    'id' => $id,
                    'invoiceNumber' => $inv['invoiceNumber'],
                    'customerName' => $inv['customerName'],
                    'items' => $inv['items'],
                    'totalItems' => (int)$inv['totalItems'],
                    'generatedBy' => $inv['generatedBy'],
                    'generatedAt' => date('c', strtotime($generatedAt)),
                    'status' => $inv['status']
                ];

                sendSuccess($newInvoice, 'Invoice added successfully');
            } catch (PDOException $e) {
                sendError('Failed to add invoice: ' . $e->getMessage(), 500);
            }
        } else {
            sendError('Method not allowed', 405);
        }
        break;

    default:
        sendError('Invalid endpoint', 404);
        break;
}
?>