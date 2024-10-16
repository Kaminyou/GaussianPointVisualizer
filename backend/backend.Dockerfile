FROM python:3.9

# other env
COPY ./requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt
RUN rm /tmp/requirements.txt

CMD ["/bin/bash"]