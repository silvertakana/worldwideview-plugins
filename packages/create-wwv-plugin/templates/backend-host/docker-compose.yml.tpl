version: '3.8'

services:
  wwv-plugin-host:
    build: .
    ports:
      - "5001:5001"
    volumes:
      - ./plugins:/app/plugins
    restart: unless-stopped
    environment:
      - PORT=5001
