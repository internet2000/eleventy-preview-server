FROM node:lts

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG SSH_PRIVATE_KEY
RUN mkdir /root/.ssh/ && \
    echo "$SSH_PRIVATE_KEY" > /root/.ssh/id_rsa && \
    chmod 600 /root/.ssh/id_rsa

EXPOSE 8080
CMD ["node", "lib/index.js"]
