package com.retailapp.controller;

import com.retailapp.model.ApiResponse;
import com.retailapp.model.User;
import com.retailapp.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse> signup(@RequestBody User user) {
        if (user.getUsername() == null || user.getPassword() == null || user.getEmail() == null) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Username, password, and email are required."));
        }

        boolean created = userService.registerUser(user);
        if (!created) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiResponse(false, "Username already exists."));
        }

        return ResponseEntity.ok(new ApiResponse(true, "Signup successful. Please login."));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody User user) {
        if (user.getUsername() == null || user.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Username and password are required."));
        }

        String token = userService.login(user.getUsername(), user.getPassword());
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false, "message", "Invalid credentials."));
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Login successful.", "token", token));
    }
}
