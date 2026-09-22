FROM nginx:alpine

# Copy web files to nginx html folder
COPY . /usr/share/nginx/html

# Configure nginx to listen on port 8080 (Cloud Run default)
RUN sed -i 's/listen       80;/listen       8080;/g' /etc/nginx/conf.d/default.conf && \
    sed -i 's/listen  \[::\]:80;/listen  \[::\]:8080;/g' /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
