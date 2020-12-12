CC = g++
COMPILE_FLAGS = -c -Wall -Werror -fpic
SO_FLAGS = -shared
IMAGE_NAME = mariadb-udf

bitap.so: bitap.o
	$(CC) $(SO_FLAGS) -o bitap.so bitap.o

bitap.o: mariadb.hpp bitap.cpp
	$(CC) $(COMPILE_FLAGS) bitap.cpp

.PHONY: clean
clean:
	rm -f bitap.so bitap.o
