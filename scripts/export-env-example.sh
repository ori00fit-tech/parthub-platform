#!/usr/bin/env bash
# Export current .env values as example (redacts secrets)
sed 's/=.*/=/' .env > .env.example.new
echo ".env.example.new generated (values stripped)"
