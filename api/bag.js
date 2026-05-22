<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Bag</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 p-4">
    <div class="max-w-md mx-auto">
        <h1 class="text-xl font-bold mb-4">YOUR BAG</h1>
        <div id="bag-items" class="space-y-3"></div>
        <div id="checkout-section" class="hidden mt-6 bg-white p-6 shadow">
            <p class="font-bold mb-4">Total: ৳<span id="total-price">0</span></p>
            <form id="orderForm" class="space-y-3">
                <input type="text" id="name" required placeholder="Full Name" class="w-full p-3 border">
                <input type="tel" id="phone" required placeholder="Phone" class="w-full p-3 border">
                <input type="tel" id="alt_phone" placeholder="Alt Phone (Optional)" class="w-full p-3 border">
                <select id="district" class="w-full p-3 border"><option value="Dhaka">Dhaka</option><option value="Outside">Outside</option></select>
                <textarea id="address" required placeholder="Address" class="w-full p-3 border"></textarea>
                <button type="submit" class="w-full bg-black text-white py-4 font-bold uppercase">PLACE ORDER</button>
            </form>
        </div>
    </div>
    <script>
        let items = [];
        async function loadBag() {
            const user = JSON.parse(localStorage.getItem('user_session'));
            const res = await fetch('/api/bag?email=' + (user ? user.email : localStorage.getItem('guest_id')));
            items = await res.json();
            let total = 0;
            document.getElementById('bag-items').innerHTML = items.map(i => {
                total += (i.price * i.quantity);
                return `
                    <div class="bg-white p-3 border flex justify-between items-center">
                        <div><p class="font-bold">${i.product_name}</p><p class="text-xs">৳${i.price * i.quantity}</p></div>
                        <button onclick="removeItem(${i.id})" class="text-red-500 font-bold text-xs uppercase">Remove</button>
                    </div>`;
            }).join('');
            document.getElementById('total-price').innerText = total;
            if(items.length > 0) document.getElementById('checkout-section').classList.remove('hidden');
        }
        async function removeItem(id) {
            await fetch('/api/bag', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id}) });
            loadBag();
        }
        document.getElementById('orderForm').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('name').value, phone: document.getElementById('phone').value,
                alt_phone: document.getElementById('alt_phone').value, district: document.getElementById('district').value,
                address: document.getElementById('address').value, payment_method: 'COD',
                products: items.map(i => `${i.product_name} (${i.size}x${i.quantity})`).join(', '),
                total_price: document.getElementById('total-price').innerText,
                status: 'Pending', image_url: items[0].image_url
            };
            await fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
            alert('Order Placed!'); window.location.href='index.html';
        }
        loadBag();
    </script>
</body>
</html>
