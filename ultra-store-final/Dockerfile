FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node outputs ./outputs
RUN mkdir -p /var/lib/ultra && chown node:node /var/lib/ultra
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=10000 DATA_DIR=/var/lib/ultra DEMO_PAYMENTS_ENABLED=false
EXPOSE 10000
CMD ["node", "outputs/account-server/preview.mjs"]
