package com.retailapp.controller;

import com.retailapp.model.ApiResponse;
import com.retailapp.model.Product;
import com.retailapp.service.ProductService;
import com.retailapp.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ProductController {
    private final ProductService productService;
    private final UserService userService;

    public ProductController(ProductService productService, UserService userService) {
        this.productService = productService;
        this.userService = userService;
    }

    @GetMapping("/products")
    public ResponseEntity<List<Product>> listProducts() {
        return ResponseEntity.ok(productService.getProducts());
    }

    @PostMapping("/purchase")
    public ResponseEntity<ApiResponse> purchase(@RequestBody Map<String, Object> payload) {
        Object tokenObj = payload.get("token");
        Object productIdObj = payload.get("productId");
        if (tokenObj == null || productIdObj == null) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Product ID and token are required."));
        }

        String token = tokenObj.toString();
        int productId;
        try {
            productId = Integer.parseInt(productIdObj.toString());
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Invalid product ID."));
        }

        if (!userService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiResponse(false, "Invalid or expired session. Please login again."));
        }

        Product product = productService.getProductById(productId);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse(false, "Product not found."));
        }

        return ResponseEntity.ok(new ApiResponse(true, "Purchase completed: " + product.getName() + " for $" + product.getPrice()));
    }
}
