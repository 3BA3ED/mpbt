cmake_minimum_required(VERSION 3.29)

if(NOT DEFINED ENV{EMSDK})
    message(FATAL_ERROR "EMSDK environment variable is not set, run \"source /path/to/emsdk/emsdk_env.sh\"")
endif()

set(CMAKE_TOOLCHAIN_FILE $ENV{EMSDK}/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake)
set(CMAKE_BUILD_TYPE MinSizeRel)

project(argon2)

include_directories(phc-winner-argon2/include)
set(sources
    phc-winner-argon2/src/blake2/blake2b.c
    phc-winner-argon2/src/argon2.c
    phc-winner-argon2/src/core.c
    phc-winner-argon2/src/encoding.c
    phc-winner-argon2/src/thread.c
	phc-winner-argon2/src/opt.c
)

add_compile_options(-O3 -msimd128 -msse2)
add_link_options(
    -O3
    -sFILESYSTEM=0
    -sEXPORTED_FUNCTIONS=_argon2_hash,_argon2_error_message,_malloc,_free
    -sEXPORTED_RUNTIME_METHODS=UTF8ToString,writeArrayToMemory
    -sASSERTIONS=0
    -sINITIAL_MEMORY=16MB
    -sMAXIMUM_MEMORY=4GB
    -sALLOW_MEMORY_GROWTH=1
    -sSINGLE_FILE=1
    -sENVIRONMENT=web,webview,worker
)

add_executable(argon2 ${sources})
add_executable(argon2-nothreads ${sources})

target_compile_options(argon2 PRIVATE -pthread)
target_link_options(argon2 PRIVATE -pthread -sPTHREAD_POOL_SIZE=navigator.hardwareConcurrency)

target_compile_definitions(argon2-nothreads PRIVATE ARGON2_NO_THREADS)
target_link_options(argon2-nothreads PRIVATE -sMODULARIZE=1 -sEXPORT_ES6=1)

set_target_properties(argon2 PROPERTIES OUTPUT_NAME argon2)
set_target_properties(argon2-nothreads PROPERTIES OUTPUT_NAME argon2-nothreads)