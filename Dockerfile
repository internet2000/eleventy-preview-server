FROM node:lts

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG SSH_PRIVATE_KEY
ENV SSH_PRIVATE_KEY=$SSH_PRIVATE_KEY
RUN mkdir /root/.ssh/ && \
    echo "$SSH_PRIVATE_KEY" > /root/.ssh/id_rsa && \
    chmod 600 /root/.ssh/id_rsa

ARG GITLAB_URL
ENV GITLAB_URL=$GITLAB_URL
RUN ssh-keyscan $GITLAB_URL >> /root/.ssh/known_hosts

EXPOSE 8080
CMD ["node", "lib/index.js"]
