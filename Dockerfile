# Dockerfile

# 1. Base Image: Using Node 20 to match the developer environment
FROM node:20 

# 2. Set Working Directory: Set the working directory inside the container
WORKDIR /app

# 3. Copy Dependency Files: Copy package.json and package-lock.json first
# This optimizes Docker build caching
COPY package*.json ./

# 4. Install Dependencies: Install project dependencies inside the container
RUN npm install

# 5. Copy Source Code: Copy the rest of the application files
COPY . .

# 6. Expose Port: Inform Docker which port the Expo Web app will run on (8081 is common)
EXPOSE 8081

# 7. Start Command: Define the non-interactive command to run when the container starts
# This bypasses the need to press 'w' manually
CMD ["npx", "expo", "start", "--web"]