# syntax=docker/dockerfile:1
FROM ubuntu
FROM python:3.12-slim-trixie
FROM node:trixie-slim

ENV FLASK_PORT=8000
ENV PRODUCTION=false
ENV BACKEND_DOMAIN=http://localhost:8000
ENV TRAME_DOMAIN=http://localhost:8080

# # Install wget
RUN  apt-get update \
  && apt-get install -y wget \
  && rm -rf /var/lib/apt/lists/*

# Install ParaView (with ADIOS2 support)
ARG PV_URL=https://www.paraview.org/files/v6.1/ParaView-6.1.1-MPI-Linux-Python3.12-x86_64.tar.gz
RUN mkdir -p ~/paraview \
  && cd ~/paraview \
  && wget -qO- ${PV_URL} | tar --strip-components=1 -xzv

# Expose Trame port
EXPOSE 8080

# # Setting up the ANACONDA environment
# Download Miniconda installer
RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh 
RUN bash /tmp/miniconda.sh -b -p /opt/miniconda

# Update the PATH environment variable
ENV PATH=/opt/miniconda/bin:$PATH

# Clean up installer
RUN rm /tmp/miniconda.sh

RUN conda tos accept \ 
    && conda update -n base -c defaults conda \
    && conda create -n pv-env python=3.12 \
    && conda install -n pv-env -c conda-forge numpy flask festim python-gmsh gmsh python-dotenv


# Expose Flask backend port
EXPOSE 8000 

WORKDIR /festim-view

COPY . .

# Expose Next.js application port
EXPOSE 3000
RUN npm i
CMD ["npm", "run", "start:all"]