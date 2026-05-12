package com.retailapp.service;

import com.retailapp.model.Product;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductService {
    private final List<Product> products = new ArrayList<>();

    public ProductService() {
        products.add(new Product(1, "Wireless Headphones", "High-quality Bluetooth headphones with noise cancellation.", 89.99));
        products.add(new Product(2, "Smart Watch", "Track your fitness and notifications on the go.", 129.99));
        products.add(new Product(3, "Portable Speaker", "Compact speaker with powerful sound and long battery life.", 45.99));
        products.add(new Product(4, "Gaming Keyboard", "Mechanical keyboard with RGB backlight.", 74.99));
        products.add(new Product(5, "Wireless Mouse", "Ergonomic mouse with precision tracking.", 29.99));
    }

    public List<Product> getProducts() {
        return products;
    }

    public Product getProductById(int id) {
        return products.stream().filter(product -> product.getId() == id).findFirst().orElse(null);
    }
}
