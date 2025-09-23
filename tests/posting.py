import requests

# 1️⃣ Login to get token
login_url = "http://127.0.0.1:8000/login"
login_data = {
    "username": "admin@eduvos.com",
    "password": "adminpass231"
}
response = requests.post(login_url, data=login_data)
token = response.json()["access_token"]

# 2️⃣ Create a post
post_url = "http://127.0.0.1:8000/posts"
headers = {"Authorization": f"Bearer {token}"}
post_data = {
    "title": "Hackathon Test Post",
    "content": "This is a test post created via API.",
    "category": "General"
}

post_response = requests.post(post_url, json=post_data, headers=headers)
print(post_response.json())
