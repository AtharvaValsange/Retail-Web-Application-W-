const { useState, useEffect } = React;

function App() {
  const [page, setPage] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orderHistory, setOrderHistory] = useState([]);

  const imageMap = {
    1: 'https://unixindia.in/cdn/shop/files/6_0d11d30e-af24-4a0e-a3d0-4a3635e52aa4.jpg?v=1767617587&width=1500',
    2: 'https://justcorseca.com/cdn/shop/files/6_95587271-5b56-47e9-bb0f-0a1f8263dc79.jpg?v=1700823367',
    3: 'https://www.myg.in/images/detailed/124/618-hB-ftdL._SL1500__ao4f-qy.jpg',
    4: 'https://static0.howtogeekimages.com/wordpress/wp-content/uploads/2022/04/rgb-lit-gaming-mechanical-keyboard.jpg',
    5: 'https://www.trustedreviews.com/wp-content/uploads/sites/7/2025/09/best-wireless-mouse.jpg',
    6: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
    7: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    8: 'https://images.unsplash.com/photo-1510552776732-09d2e1b0f471?auto=format&fit=crop&w=800&q=80',
    9: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80',
  };

  const scrollToProducts = () => {
    const productsElement = document.getElementById('products');
    if (productsElement) {
      productsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (token) {
      fetchProducts();
      setPage('main');
    }
  }, [token]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const categories = ['All', ...Array.from(new Set(products.map((product) => product.category))).filter(Boolean)];

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    if (!query) {
      return matchesCategory;
    }
    return (
      matchesCategory &&
      (product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query))
    );
  });

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      const withImages = data.map((product) => {
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category || 'Accessories',
          badge: product.badge || 'Popular',
          image: imageMap[product.id] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
        };
      });
      setProducts(withImages);
    } catch (error) {
      setMessage('Could not fetch products.');
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage('');
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setPage('main');
      setMessage('Login successful!');
    } else {
      setMessage(data.message || 'Login failed.');
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setMessage('');
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      setMessage('Account created. Please log in.');
      setPage('login');
    } else {
      setMessage(data.message || 'Signup failed.');
    }
  };

  const handlePurchase = async (productId) => {
    setMessage('');
    const response = await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, token }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      setMessage(data.message);
    } else {
      setMessage(data.message || 'Purchase failed.');
      if (response.status === 401) {
        handleLogout();
      }
    }
  };

  const handleAddToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => {
          if (item.id === product.id) {
            return {
              id: item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              badge: item.badge,
              image: item.image,
              quantity: item.quantity + 1,
            };
          }
          return item;
        });
      }
      return current.concat([{
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        badge: product.badge,
        image: product.image,
        quantity: 1,
      }]);
    });
    setMessage(`${product.name} added to cart.`);
  };

  const handleRemoveFromCart = (productId) => {
    setCart((current) => current.filter((item) => item.id !== productId));
  };

  const handleCheckout = async () => {
    if (!cart.length) {
      setMessage('Your cart is empty. Add items to checkout.');
      return;
    }

    let purchased = 0;
    for (const item of cart) {
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.id, token }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        purchased += item.quantity;
      } else if (response.status === 401) {
        handleLogout();
        return;
      }
    }

    if (purchased) {
      const now = new Date();
      const orderDate = now.toLocaleString();
      const estimatedDelivery = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const orderItems = cart.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
      }));
      const orderTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const orderNumber = `#${String(Date.now()).slice(-8)}`;
      
      setOrderHistory((current) => [{
        id: Date.now(),
        orderNumber: orderNumber,
        date: orderDate,
        status: 'Processing',
        estimatedDelivery: estimatedDelivery,
        items: orderItems,
        total: orderTotal,
      }, ...current]);
      
      setCart([]);
      setMessage(`✅ Order placed! Order number: ${orderNumber}`);
      setPage('order');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setPage('login');
    setUsername('');
    setPassword('');
    setEmail('');
    setProducts([]);
    setCart([]);
    setSearchQuery('');
    setSelectedCategory('All');
    setOrderHistory([]);
    setMessage('Logged out successfully.');
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main>
      <header>
        <div>
          <h1>Retail Shop</h1>
          <p>Modern shopping for your favorite tech and lifestyle products.</p>
        </div>
        </header>

      {token && (
        <nav className="navbar">
          <div className="navbar-left">
            <button
              type="button"
              className={page === 'home' ? 'active' : ''}
              onClick={() => {
                setPage('home');
                setSelectedCategory('All');
                setSearchQuery('');
              }}
            >
              Home
            </button>
            <button type="button" className={page === 'cart' ? 'active' : ''} onClick={() => setPage('cart')}>Cart</button>
            <button type="button" className={page === 'order' ? 'active' : ''} onClick={() => setPage('order')}>Order History</button>
          </div>
          <div className="navbar-center">
            <input
              className="search-bar"
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button type="button" className="secondary" onClick={scrollToProducts}>Search</button>
          </div>
          <div className="navbar-right">
            <button type="button" className="secondary" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
      )}

      {message && <div className="alert">{message}</div>}

      {page === 'login' && (
        <div className="card auth-card">
          <h2>Login</h2>
          <p>Welcome back! Enter your credentials to continue shopping.</p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
            </div>
            <button type="submit">Login</button>
          </form>
          <p className="auth-footer">Don't have an account? <button className="secondary" onClick={() => setPage('signup')}>Sign Up</button></p>
        </div>
      )}

      {page === 'signup' && (
        <div className="card auth-card">
          <h2>Create Account</h2>
          <p>Join now and start shopping the best tech and accessories.</p>
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password" />
            </div>
            <button type="submit">Create Account</button>
          </form>
          <p className="auth-footer">Already have an account? <button className="secondary" onClick={() => setPage('login')}>Login</button></p>
        </div>
      )}

      {page === 'main' && (
        <div className="shop-layout">
          <div className="store-area">
            <section className="hero hero-large">
              <div className="hero-copy">
                <span className="hero-label">Retail Dashboard</span>
                <h2>Welcome back to your dashboard.</h2>
                <p>Browse our products, manage your cart, and track your orders from here.</p>
                <div className="hero-stats">
                  <div>
                    <strong>{products.length}</strong>
                    <span>Products Available</span>
                  </div>
                  <div>
                    <strong>{cartCount}</strong>
                    <span>Items in Cart</span>
                  </div>
                  <div>
                    <strong>{orderHistory.length}</strong>
                    <span>Orders Placed</span>
                  </div>
                </div>
                <div className="hero-actions">
                  <button type="button" onClick={() => setPage('home')}>Start Shopping</button>
                  <button type="button" className="secondary" onClick={() => setPage('order')}>View Orders</button>
                </div>
              </div>
              <div className="hero-panel">
                <div className="hero-card hero-card-top">
                  <span>🛍️ Shop</span>
                  <strong>Explore products</strong>
                  <p>Browse our full catalog of latest tech and accessories.</p>
                </div>
                <div className="hero-card hero-card-bottom">
                  <span>📦 Track</span>
                  <strong>Order history</strong>
                  <p>View all your past orders and delivery status.</p>
                </div>
              </div>
            </section>
          </div>

          <aside className="cart-panel">
            <div className="cart-card">
              <div className="cart-header">
                <h2>Your Cart</h2>
                <span>{cartCount} items</span>
              </div>
              {cart.length === 0 ? (
                <p className="empty-cart">Your bag is empty. Add items from Home to populate it.</p>
              ) : (
                <div className="cart-items">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.quantity} × ${item.price.toFixed(2)}</p>
                      </div>
                      <button className="cart-remove" onClick={() => handleRemoveFromCart(item.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="cart-footer">
                <div>
                  <span>Total</span>
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>
                <button className="checkout" type="button" onClick={handleCheckout}>Checkout</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {page === 'home' && (
        <div className="shop-layout">
          <div className="store-area">
            <section className="hero hero-large">
              <div className="hero-copy">
                <span className="hero-label">Home Page</span>
                <h2>Shop our full item list in a fresh experience.</h2>
                <p>Browse mobile phones, headphones, laptops, smartwatches, and more.</p>
                <div className="hero-actions">
                  <button type="button" onClick={() => setPage('main')}>Back to Main</button>
                  <button type="button" className="secondary" onClick={scrollToProducts}>Browse Products</button>
                </div>
              </div>
              <div className="hero-panel">
                <div className="hero-card hero-card-top">
                  <span>Full catalog</span>
                  <strong>All categories</strong>
                  <p>See every product in one attractive listing page.</p>
                </div>
                <div className="hero-card hero-card-bottom">
                  <span>Easy filter</span>
                  <strong>Category browsing</strong>
                  <p>Select a category to show only those items.</p>
                </div>
              </div>
            </section>

            <section className="store-header">
              <div>
                <span className="hero-label">Items List</span>
                <h4>All available products</h4>
              </div>
              {/* <p>Select a category or search to narrow the product list instantly.</p> */}
            </section>

            <div id="products" className="category-tabs">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={selectedCategory === category ? 'category-tab active' : 'category-tab'}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            {filteredProducts.length > 0 ? (
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="product-card">
                    <div className="product-image-wrapper">
                      <img className="product-image" src={product.image} alt={product.name} />
                      <span className="product-badge">{product.badge}</span>
                    </div>
                    <div className="product-content">
                      <div className="product-info">
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                      </div>
                      <div className="product-meta">
                        <strong>${product.price.toFixed(2)}</strong>
                        <button type="button" onClick={() => handleAddToCart(product)}>Add to Cart</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-search">No products match "{searchQuery}" in {selectedCategory}.</p>
            )}
          </div>

          <aside className="cart-panel">
            <div className="cart-card">
              <div className="cart-header">
                <h2>Your Cart</h2>
                <span>{cartCount} items</span>
              </div>
              {cart.length === 0 ? (
                <p className="empty-cart">Your bag is empty. Add items to see them here.</p>
              ) : (
                <div className="cart-items">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.quantity} × ${item.price.toFixed(2)}</p>
                      </div>
                      <button className="cart-remove" onClick={() => handleRemoveFromCart(item.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="cart-footer">
                <div>
                  <span>Total</span>
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>
                <button className="checkout" type="button" onClick={handleCheckout}>Checkout</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {page === 'cart' && (
        <div className="cart-page">
          <section className="cart-main card">
            <h2>Shopping Cart</h2>
            <p>Review the items you added and complete your purchase when ready.</p>
            {cart.length === 0 ? (
              <p className="empty-cart">Your cart is empty. Browse the home page to add products.</p>
            ) : (
              <div className="cart-items">
                {cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.quantity} × ${item.price.toFixed(2)}</p>
                    </div>
                    <button className="cart-remove" onClick={() => handleRemoveFromCart(item.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            <div className="cart-footer">
              <div>
                <span>Total</span>
                <strong>${cartTotal.toFixed(2)}</strong>
              </div>
              <button className="checkout" type="button" onClick={handleCheckout}>Checkout</button>
            </div>
          </section>
        </div>
      )}

      {page === 'order' && (
        <div className="order-history">
          <section className="order-header-section">
            <h1>Your Orders</h1>
            <p>Track and manage your purchases</p>
          </section>
          {orderHistory.length === 0 ? (
            <section className="card order-empty">
              <p>No orders yet. Complete a checkout to see your order history.</p>
              <button type="button" onClick={() => setPage('home')}>Start Shopping</button>
            </section>
          ) : (
            <div className="order-list">
              {orderHistory.map((order) => (
                <div key={order.id} className="order-card-container">
                  <div className="order-card-top">
                    <div className="order-meta">
                      <span className="order-number">Order {order.orderNumber}</span>
                      <span className="order-date">Placed on {order.date}</span>
                    </div>
                    <span className="order-status processing">{order.status}</span>
                  </div>
                  <div className="order-card-main">
                    <div className="order-items-section">
                      <div className="order-items-grid">
                        {order.items.map((item) => (
                          <div key={item.id} className="order-item-card">
                            <img className="order-item-image" src={item.image} alt={item.name} />
                            <div className="order-item-details">
                              <h4
                                className="order-item-link"
                                onClick={() => {
                                  setPage('home');
                                  setSelectedCategory('All');
                                  setSearchQuery(item.name);
                                }}
                              >
                                {item.name}
                              </h4>
                              <p>Qty: {item.quantity}</p>
                              <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="order-summary">
                      <div className="order-summary-item">
                        <span>Subtotal</span>
                        <span>${order.total.toFixed(2)}</span>
                      </div>
                      <div className="order-summary-item">
                        <span>Shipping</span>
                        <span>Free</span>
                      </div>
                      <div className="order-summary-total">
                        <span>Order Total</span>
                        <strong>${order.total.toFixed(2)}</strong>
                      </div>
                      <div className="order-delivery">
                        <span>📦 Estimated Delivery</span>
                        <strong>{order.estimatedDelivery}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="order-actions">
                    <button type="button" className="secondary">Track Order</button>
                    <button type="button" className="secondary">Return Items</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <footer>
        <p>Retail Application — Java backend with React frontend.</p>
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
