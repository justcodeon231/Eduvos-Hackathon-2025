import requests

# 1️⃣ Login to get token
login_url = "http://127.0.0.1:8000/login"
login_data = {
    "username": "newuser@example.com",
    "password": "123456"
}
response = requests.post(login_url, data=login_data)
token = response.json()["access_token"]

# 2️⃣ Get all posts
posts_url = "http://127.0.0.1:8000/posts"
headers = {"Authorization": f"Bearer {token}"}
posts_response = requests.get(posts_url, headers=headers)

print(posts_response.status_code)
print(posts_response.json())
