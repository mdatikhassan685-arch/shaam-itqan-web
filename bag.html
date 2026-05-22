<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
    <title>My Bag</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-black font-sans pb-20">
    <div class="max-w-md mx-auto w-full px-4">
        <h1 class="text-lg font-bold my-4 uppercase tracking-widest">YOUR BAG</h1>
        <div id="bag-items" class="space-y-4"></div>
        
        <div id="checkout-section" class="hidden mt-6 border-t pt-6">
            <p class="font-bold mb-4 text-sm">Total: ৳<span id="total-price">0</span></p>
            <form id="orderForm" class="space-y-3">
                <input type="text" id="name" required placeholder="Full Name" class="w-full p-3 border text-sm">
                <input type="tel" id="phone" required placeholder="Phone" class="w-full p-3 border text-sm">
                <input type="tel" id="alt_phone" placeholder="Alt Phone (Optional)" class="w-full p-3 border text-sm">
                <select id="district" class="w-full p-3 border text-sm"><option value="Dhaka">Dhaka</option><option value="Outside">Outside</option></select>
                <textarea id="address" required placeholder="Full Address" class="w-full p-3 border text-sm h-20"></textarea>
                <select id="payment" class="w-full p-3 border text-sm"><option value="COD">Cash On Delivery</option></select>
                <textarea id="note" placeholder="Order Note" class="w-full p-3 border text-sm h-16"></textarea>
                <button type="submit" class="w-full bg-black text-white py-4 font-bold text-[10px] uppercase tracking-widest hover:bg-[#D4AF37] transition">PLACE ORDER</button>
            </form>
        </div>
    </div>
    <script>
        let items = [];
        const userId = localStorage.getItem('user_session') ? JSON.parse(localStorage.getItem('user_session')).email : localStorage.getItem('guest_id');

        async function loadBag() {
            const res = await fetch('/api/bag?email=' + userId);
            items = await res.json();
            let total = 0;
            const container = document.getElementById('bag-items');
            if(items.length === 0) { container.innerHTML = '<p class="text-center py-10">Bag is Empty</p>'; return; }
            
            container.innerHTML = items.map(i => {
                total += (i.price * i.quantity);
                return `<div class="flex items-center gap-4 border p-2">
                    <img src="${i.image_url}" class="w-16 h-16 object-cover">
                    <div class="flex-grow text-xs"><b>${i.product_name}</b><br>Size: ${i.size} | Qty: ${i.quantity}</div>
                    <button onclick="removeItem(${i.id})" class="text-red-500 font-bold text-[10px]">REMOVE</button>
                </div>`;
            }).join('');
            document.getElementById('total-price').innerText = total;
            document.getElementById('checkout-section').classList.remove('hidden');
        }

        async function removeItem(id) { await fetch('/api/bag', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id}) }); loadBag(); }

        document.getElementById('orderForm').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('name').value, phone: document.getElementById('phone').value,
                alt_phone: document.getElementById('alt_phone').value, district: document.getElementById('district').value,
                address: document.getElementById('address').value, payment_method: document.getElementById('payment').value,
                order_note: document.getElementById('note').value, email: userId,
                products: items.map(i => `${i.product_name} (${i.size}x${i.quantity})`).join(', '),
                total_price: document.getElementById('total-price').innerText, status: 'Pending', image_url: items[0].image_url
            };
            await fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
            alert('Order Success!'); window.location.href='index.html';
        }
        loadBag();
    </script>
</body>
</html>
