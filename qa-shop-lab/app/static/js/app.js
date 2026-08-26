(function () {
    "use strict";

    var CART_KEY = "qa_shop_cart_id";
    var TOKEN_KEY = "qa_shop_token";
    var EMAIL_KEY = "qa_shop_email";

    function money(value) {
        var sign = value < 0 ? "-" : "";
        var abs = Math.abs(Math.round(value));
        return sign + "$" + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function toast(message, isError) {
        var el = document.getElementById("toast");
        if (!el) { return; }
        el.textContent = message;
        el.className = "toast show" + (isError ? " error" : "");
        window.clearTimeout(el._timer);
        el._timer = window.setTimeout(function () {
            el.className = "toast";
        }, 3500);
    }

    function api(method, path, body) {
        var options = { method: method, headers: {} };
        var token = window.localStorage.getItem(TOKEN_KEY);
        if (token) { options.headers["Authorization"] = "Bearer " + token; }
        if (body !== undefined) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }
        return fetch(path, options).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (data) {
                return { status: response.status, ok: response.ok, data: data };
            });
        });
    }

    function errorText(result) {
        if (result.data && result.data.error) { return result.data.error; }
        return "La operacion fallo (HTTP " + result.status + ")";
    }

    function ensureCart() {
        var stored = window.localStorage.getItem(CART_KEY);
        if (stored) { return Promise.resolve(parseInt(stored, 10)); }
        return api("POST", "/api/carts").then(function (result) {
            if (!result.ok) { throw new Error(errorText(result)); }
            window.localStorage.setItem(CART_KEY, result.data.cart_id);
            return result.data.cart_id;
        });
    }

    /* ---------- Inicio ---------- */

    function initHome() {
        var target = document.getElementById("health-status");
        api("GET", "/api/health").then(function (result) {
            if (result.ok) {
                target.textContent = "Servicio disponible (version " + result.data.version + ").";
            } else {
                target.textContent = "El servicio no responde correctamente.";
            }
        }).catch(function () {
            target.textContent = "No fue posible contactar el servicio.";
        });
    }

    /* ---------- Productos ---------- */

    function productCard(product) {
        var card = document.createElement("article");
        card.className = "product-card";

        var title = document.createElement("h3");
        title.textContent = product.name;

        var price = document.createElement("p");
        price.className = "product-price";
        price.textContent = money(product.price);

        var stock = document.createElement("p");
        stock.className = "product-stock";
        stock.textContent = "Stock disponible: " + product.stock;

        var actions = document.createElement("div");
        actions.className = "product-actions";

        var qty = document.createElement("input");
        qty.type = "number";
        qty.value = "1";
        qty.setAttribute("aria-label", "Cantidad de " + product.name);

        var button = document.createElement("button");
        button.className = "btn btn-primary";
        button.type = "button";
        button.textContent = "Agregar al carrito";
        button.addEventListener("click", function () {
            var quantity = parseInt(qty.value, 10);
            if (isNaN(quantity)) {
                toast("Ingrese una cantidad.", true);
                return;
            }
            ensureCart().then(function (cartId) {
                return api("POST", "/api/carts/" + cartId + "/items", {
                    product_id: product.id,
                    quantity: quantity
                });
            }).then(function (result) {
                if (result.ok) {
                    toast(product.name + " agregado al carrito.");
                } else {
                    toast(errorText(result), true);
                }
            }).catch(function (error) {
                toast(error.message, true);
            });
        });

        actions.appendChild(qty);
        actions.appendChild(button);
        card.appendChild(title);
        card.appendChild(price);
        card.appendChild(stock);
        card.appendChild(actions);
        return card;
    }

    function renderProducts(products) {
        var grid = document.getElementById("product-grid");
        grid.innerHTML = "";
        if (!products.length) {
            var empty = document.createElement("p");
            empty.className = "muted";
            empty.textContent = "No se encontraron productos.";
            grid.appendChild(empty);
            return;
        }
        products.forEach(function (product) {
            grid.appendChild(productCard(product));
        });
    }

    function loadProducts() {
        api("GET", "/api/products").then(function (result) {
            if (result.ok) {
                renderProducts(result.data);
            } else {
                toast(errorText(result), true);
            }
        });
    }

    function initProducts() {
        loadProducts();

        document.getElementById("search-form").addEventListener("submit", function (event) {
            event.preventDefault();
            var term = document.getElementById("search-input").value;
            api("GET", "/api/search?q=" + encodeURIComponent(term)).then(function (result) {
                if (result.ok) {
                    renderProducts(result.data.results);
                } else {
                    toast(errorText(result), true);
                }
            });
        });

        document.getElementById("search-reset").addEventListener("click", function () {
            document.getElementById("search-input").value = "";
            loadProducts();
        });
    }

    /* ---------- Carrito ---------- */

    function renderCart(summary) {
        document.getElementById("cart-id-label").textContent = summary.cart_id;

        var tbody = document.getElementById("cart-items");
        tbody.innerHTML = "";

        if (!summary.items.length) {
            var row = document.createElement("tr");
            var cell = document.createElement("td");
            cell.colSpan = 5;
            cell.className = "muted";
            cell.textContent = "El carrito esta vacio.";
            row.appendChild(cell);
            tbody.appendChild(row);
        }

        summary.items.forEach(function (item) {
            var tr = document.createElement("tr");

            [item.name, money(item.unit_price), item.quantity, money(item.line_total)]
                .forEach(function (value) {
                    var td = document.createElement("td");
                    td.textContent = value;
                    tr.appendChild(td);
                });

            var actionCell = document.createElement("td");
            var remove = document.createElement("button");
            remove.className = "btn-link";
            remove.type = "button";
            remove.textContent = "Quitar";
            remove.addEventListener("click", function () {
                api("DELETE", "/api/carts/" + summary.cart_id + "/items/" + item.item_id)
                    .then(function (result) {
                        if (result.ok) {
                            renderCart(result.data.cart);
                            toast("Item eliminado.");
                        } else {
                            toast(errorText(result), true);
                        }
                    });
            });
            actionCell.appendChild(remove);
            tr.appendChild(actionCell);
            tbody.appendChild(tr);
        });

        document.getElementById("cart-subtotal").textContent = money(summary.subtotal);
        document.getElementById("cart-discount").textContent = money(summary.discount);
        document.getElementById("cart-total").textContent = money(summary.total);

        if (summary.coupon) {
            document.getElementById("coupon-input").value = summary.coupon;
        }
    }

    function loadCart() {
        ensureCart().then(function (cartId) {
            return api("GET", "/api/carts/" + cartId);
        }).then(function (result) {
            if (result.ok) {
                renderCart(result.data);
            } else {
                window.localStorage.removeItem(CART_KEY);
                toast(errorText(result), true);
            }
        }).catch(function (error) {
            toast(error.message, true);
        });
    }

    function initCart() {
        loadCart();

        document.getElementById("coupon-apply").addEventListener("click", function () {
            var code = document.getElementById("coupon-input").value;
            ensureCart().then(function (cartId) {
                return api("POST", "/api/carts/" + cartId + "/coupon", { code: code });
            }).then(function (result) {
                if (result.ok) {
                    renderCart(result.data.cart);
                    toast("Cupon aplicado.");
                } else {
                    toast(errorText(result), true);
                }
            });
        });

        document.getElementById("cart-new").addEventListener("click", function () {
            window.localStorage.removeItem(CART_KEY);
            document.getElementById("order-result").className = "panel hidden";
            loadCart();
        });

        document.getElementById("checkout-btn").addEventListener("click", function () {
            ensureCart().then(function (cartId) {
                return api("POST", "/api/checkout", { cart_id: cartId });
            }).then(function (result) {
                if (result.ok) {
                    document.getElementById("order-result").className = "panel";
                    document.getElementById("order-detail").textContent =
                        JSON.stringify(result.data, null, 2);
                    window.localStorage.removeItem(CART_KEY);
                    toast("Compra realizada.");
                    loadCart();
                } else {
                    toast(errorText(result), true);
                }
            });
        });
    }

    /* ---------- Login ---------- */

    function showSession() {
        var info = document.getElementById("session-info");
        var token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) {
            info.textContent = "Sin sesion iniciada.";
            return;
        }
        api("GET", "/api/me").then(function (result) {
            if (result.ok) {
                info.textContent = "Sesion activa: " + result.data.email +
                    " (perfil " + result.data.role + ").";
            } else {
                info.textContent = "La sesion almacenada ya no es valida.";
            }
        });
    }

    function initLogin() {
        showSession();

        document.getElementById("login-form").addEventListener("submit", function (event) {
            event.preventDefault();
            var email = document.getElementById("email").value;
            var password = document.getElementById("password").value;
            api("POST", "/api/login", { email: email, password: password })
                .then(function (result) {
                    if (result.ok) {
                        window.localStorage.setItem(TOKEN_KEY, result.data.token);
                        window.localStorage.setItem(EMAIL_KEY, result.data.email);
                        toast("Bienvenido, " + result.data.email + ".");
                        showSession();
                    } else {
                        toast(errorText(result), true);
                    }
                });
        });

        document.getElementById("logout-btn").addEventListener("click", function () {
            window.localStorage.removeItem(TOKEN_KEY);
            window.localStorage.removeItem(EMAIL_KEY);
            showSession();
            toast("Sesion cerrada.");
        });
    }

    var pages = {
        home: initHome,
        products: initProducts,
        cart: initCart,
        login: initLogin
    };

    document.addEventListener("DOMContentLoaded", function () {
        var page = document.body.getAttribute("data-page");
        if (pages[page]) { pages[page](); }
    });
}());
