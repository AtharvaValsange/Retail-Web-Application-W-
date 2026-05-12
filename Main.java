import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class Main {
    private static final Map<String, User> users = new HashMap<>();
    private static final Map<String, String> tokenToUser = new HashMap<>();
    private static final List<Product> products = List.of(
            new Product(1, "Wireless Headphones", "High-quality Bluetooth headphones with noise cancellation.", 89.99, "Headphones"),
            new Product(2, "Smart Watch", "Track your fitness and notifications on the go.", 129.99, "Smartwatches"),
            new Product(3, "Portable Speaker", "Compact speaker with powerful sound and long battery life.", 45.99, "Accessories"),
            new Product(4, "Gaming Keyboard", "Mechanical keyboard with RGB backlight.", 74.99, "Accessories"),
            new Product(5, "Wireless Mouse", "Ergonomic mouse with precision tracking.", 29.99, "Accessories"),
            new Product(6, "Blaze Phone X", "Sleek smartphone with pro camera and long battery life.", 699.99, "Mobile Phones"),
            new Product(7, "Pro Laptop 15", "High-performance laptop for work and creative projects.", 1099.99, "Laptops"),
            new Product(8, "Noise-Canceling Earbuds", "Compact earbuds with rich sound and active noise cancellation.", 99.99, "Headphones"),
            new Product(9, "Fitness Tracker", "Lightweight tracker with sleep and health insights.", 59.99, "Smartwatches")
    );

    public static void main(String[] args) throws IOException {
        int port = 8080;
        HttpServer server;
        try {
            server = HttpServer.create(new InetSocketAddress(port), 0);
        } catch (IOException ex) {
            System.err.println("Port " + port + " is already in use. Trying port 8081...");
            port = 8081;
            server = HttpServer.create(new InetSocketAddress(port), 0);
        }
        server.createContext("/api/signup", new SignupHandler());
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/products", new ProductsHandler());
        server.createContext("/api/purchase", new PurchaseHandler());
        server.createContext("/", new StaticHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("Server started at http://localhost:" + port);
    }

    static class SignupHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                writeJson(exchange, 405, Map.of("success", false, "message", "Only POST allowed."));
                return;
            }
            String body = readBody(exchange);
            Map<String, String> request = parseJson(body);
            if (request.get("username") == null || request.get("password") == null || request.get("email") == null) {
                writeJson(exchange, 400, Map.of("success", false, "message", "Username, password, and email are required."));
                return;
            }
            String username = request.get("username");
            if (users.containsKey(username)) {
                writeJson(exchange, 409, Map.of("success", false, "message", "Username already exists."));
                return;
            }
            users.put(username, new User(username, request.get("password"), request.get("email")));
            writeJson(exchange, 200, Map.of("success", true, "message", "Signup successful. Please login."));
        }
    }

    static class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                writeJson(exchange, 405, Map.of("success", false, "message", "Only POST allowed."));
                return;
            }
            String body = readBody(exchange);
            Map<String, String> request = parseJson(body);
            String username = request.get("username");
            String password = request.get("password");
            if (username == null || password == null) {
                writeJson(exchange, 400, Map.of("success", false, "message", "Username and password are required."));
                return;
            }
            User user = users.get(username);
            if (user == null || !user.password.equals(password)) {
                writeJson(exchange, 401, Map.of("success", false, "message", "Invalid credentials."));
                return;
            }
            String token = UUID.randomUUID().toString();
            tokenToUser.put(token, username);
            writeJson(exchange, 200, Map.of("success", true, "message", "Login successful.", "token", token));
        }
    }

    static class ProductsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                writeJson(exchange, 405, Map.of("success", false, "message", "Only GET allowed."));
                return;
            }
            String json = "[" + String.join(",", products.stream().map(Product::toJson).toList()) + "]";
            writeJsonRaw(exchange, 200, json);
        }
    }

    static class PurchaseHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                writeJson(exchange, 405, Map.of("success", false, "message", "Only POST allowed."));
                return;
            }
            String body = readBody(exchange);
            Map<String, String> request = parseJson(body);
            String token = request.get("token");
            String productIdValue = request.get("productId");
            if (token == null || productIdValue == null) {
                writeJson(exchange, 400, Map.of("success", false, "message", "Product ID and token are required."));
                return;
            }
            if (!tokenToUser.containsKey(token)) {
                writeJson(exchange, 401, Map.of("success", false, "message", "Invalid or expired session. Please login again."));
                return;
            }
            int productId;
            try {
                productId = Integer.parseInt(productIdValue);
            } catch (NumberFormatException ex) {
                writeJson(exchange, 400, Map.of("success", false, "message", "Invalid product ID."));
                return;
            }
            Product product = products.stream().filter(p -> p.id == productId).findFirst().orElse(null);
            if (product == null) {
                writeJson(exchange, 404, Map.of("success", false, "message", "Product not found."));
                return;
            }
            writeJson(exchange, 200, Map.of("success", true, "message", "Purchase completed: " + product.name + " for $" + product.price));
        }
    }

    static class StaticHandler implements HttpHandler {
        private final File staticDir = new File("src/main/resources/static");

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }
            File file = new File(staticDir, path.substring(1));
            if (file.isDirectory()) {
                file = new File(file, "index.html");
            }
            if (!file.exists() || !file.getCanonicalPath().startsWith(staticDir.getCanonicalPath())) {
                writeNotFound(exchange);
                return;
            }
            String contentType = getContentType(file.getName());
            byte[] bytes = Files.readAllBytes(file.toPath());
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }

        private void writeNotFound(HttpExchange exchange) throws IOException {
            byte[] bytes = "404 Not Found".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
            exchange.sendResponseHeaders(404, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    private static String readBody(HttpExchange exchange) throws IOException {
        try (InputStream input = exchange.getRequestBody(); ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            byte[] data = new byte[1024];
            int length;
            while ((length = input.read(data)) != -1) {
                buffer.write(data, 0, length);
            }
            return buffer.toString(StandardCharsets.UTF_8);
        }
    }

    private static Map<String, String> parseJson(String json) {
        Map<String, String> result = new HashMap<>();
        json = json.trim();
        if (json.startsWith("{") && json.endsWith("}")) {
            String body = json.substring(1, json.length() - 1).trim();
            if (!body.isEmpty()) {
                String[] pairs = body.split("\",\\s*\"");
                for (String pair : pairs) {
                    pair = pair.trim();
                    if (pair.startsWith("\"")) {
                        pair = pair.substring(1);
                    }
                    if (pair.endsWith("\"")) {
                        pair = pair.substring(0, pair.length() - 1);
                    }
                    String[] parts = pair.split("\":\\s*\"", 2);
                    if (parts.length != 2) continue;
                    String key = unquote(parts[0].trim());
                    String value = unquote(parts[1].trim());
                    result.put(key, value);
                }
            }
        }
        return result;
    }

    private static String unquote(String value) {
        if (value.startsWith("\"") && value.endsWith("\"")) {
            return value.substring(1, value.length() - 1).replace("\\\"", "\"");
        }
        return value;
    }

    private static void writeJson(HttpExchange exchange, int code, Map<String, Object> body) throws IOException {
        StringBuilder builder = new StringBuilder("{");
        boolean first = true;
        for (var entry : body.entrySet()) {
            if (!first) builder.append(',');
            builder.append('"').append(entry.getKey()).append('"').append(':');
            Object value = entry.getValue();
            if (value instanceof Number || value instanceof Boolean) {
                builder.append(value.toString());
            } else {
                builder.append('"').append(escapeJson(value.toString())).append('"');
            }
            first = false;
        }
        builder.append('}');
        writeJsonRaw(exchange, code, builder.toString());
    }

    private static void writeJsonRaw(HttpExchange exchange, int code, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(code, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private static String getContentType(String filename) {
        if (filename.endsWith(".html")) return "text/html; charset=utf-8";
        if (filename.endsWith(".css")) return "text/css; charset=utf-8";
        if (filename.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (filename.endsWith(".json")) return "application/json; charset=utf-8";
        if (filename.endsWith(".png")) return "image/png";
        if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    static class User {
        final String username;
        final String password;
        final String email;

        User(String username, String password, String email) {
            this.username = username;
            this.password = password;
            this.email = email;
        }
    }

    static class Product {
        final int id;
        final String name;
        final String description;
        final double price;
        final String category;

        Product(int id, String name, String description, double price, String category) {
            this.id = id;
            this.name = name;
            this.description = description;
            this.price = price;
            this.category = category;
        }

        String toJson() {
            return "{\"id\":" + id + ",\"name\":\"" + escapeJson(name) + "\",\"description\":\"" + escapeJson(description) + "\",\"price\":" + price + ",\"category\":\"" + escapeJson(category) + "\"}";
        }
    }
}
