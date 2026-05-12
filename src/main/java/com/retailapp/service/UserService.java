package com.retailapp.service;

import com.retailapp.model.User;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class UserService {
    private final Map<String, User> users = new HashMap<>();
    private final Map<String, String> tokenToUsername = new HashMap<>();

    public boolean registerUser(User user) {
        if (users.containsKey(user.getUsername())) {
            return false;
        }
        users.put(user.getUsername(), new User(user.getUsername(), user.getPassword(), user.getEmail()));
        return true;
    }

    public String login(String username, String password) {
        User existing = users.get(username);
        if (existing == null || !existing.getPassword().equals(password)) {
            return null;
        }
        String token = UUID.randomUUID().toString();
        tokenToUsername.put(token, username);
        return token;
    }

    public boolean validateToken(String token) {
        return token != null && tokenToUsername.containsKey(token);
    }

    public User getUserByToken(String token) {
        String username = tokenToUsername.get(token);
        if (username == null) {
            return null;
        }
        return users.get(username);
    }
}
