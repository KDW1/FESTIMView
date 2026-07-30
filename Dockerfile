# syntax=docker/dockerfile:1
FROM ubuntu
FROM python:3.12-slim-trixie
FROM node

ENV FLASK_PORT=8000
ENV PRODUCTION=false
ENV BACKEND_DOMAIN=http://localhost:8000
ENV TRAME_DOMAIN=http://localhost:8080

# # Install wget
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Install ParaView (with ADIOS2 support)
ARG PV_URL=https://www.paraview.org/files/v6.1/ParaView-6.1.1-MPI-Linux-Python3.12-x86_64.tar.gz
RUN mkdir -p ~/paraview && cd ~/paraview && wget -qO- ${PV_URL} | tar --strip-components=1 -xzv

# Expose Trame port
EXPOSE 8080

# # Setting up the ANACONDA environment
# Download Miniconda installer
RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh

# Install Miniconda
RUN bash /tmp/miniconda.sh -b -p /opt/miniconda

# Update the PATH environment variable
ENV PATH=/opt/miniconda/bin:$PATH

# Clean up installer
RUN rm /tmp/miniconda.sh

# Ensure Conda is updated
RUN conda tos accept
RUN conda update -n base -c defaults conda
RUN conda create -n pv-env python=3.12
RUN conda install -n pv-env -c conda-forge numpy flask festim
RUN conda install -n pv-env -c conda-forge python-gmsh gmsh
RUN conda install -n pv-env -c conda-forge python-dotenv

# Expose Flask backend port
EXPOSE 8000 

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git
RUN git clone --depth 1 https://github.com/KDW1/festim-view
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y npm
WORKDIR /festim-view

# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
RUN uv venv -n .pvenv -p 3.12
ENV PATH="/festim-view/.pvenv/bin:$PATH"
RUN uv pip install --upgrade pip
RUN uv pip install python-dotenv
RUN uv pip install trame trame-vtk trame-vuetify trame-iframe

RUN npm i

# Expose Next.js application port
EXPOSE 3000

CMD ["npm", "run", "start:all"]