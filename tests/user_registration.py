import requests

register_url = "http://127.0.0.1:8000/register"
user_data = {
    "email": "newuser@example.com",
    "name": "Leo",
    "password": "123456"
}

response = requests.post(register_url, json=user_data)
print(response.status_code)
print(response.json())
